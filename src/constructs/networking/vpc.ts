import { allocateCidrBlock, allocateSubnetMask, constructId } from '@tinystacks/iac-utils';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VpcPeerDnsResolution } from './vpc-peer-dns-resolution';

interface ExternalVpcPeers {

}

export interface EcsVpcProps {
    cidrBlock?: string;
    internetAccess: boolean;
    internalPeers: VPC[],
    externalPeers: ExternalVpcPeers[]
}

export class VPC extends Construct {
  private readonly _vpc: ec2.IVpc;
  private subnetConfiguration: { cidrMask: number; name: string; subnetType: ec2.SubnetType; }[];
  private cidrBlock: string;
  private cidrBlockMask: number;
  private subnetMask: number;
    
  constructor (scope: Construct, id: string, props: EcsVpcProps) {
    super(scope, id);
    
    const {
      cidrBlock,
      internetAccess
    } = props;
    
    if (cidrBlock) {
      this.cidrBlock = cidrBlock;
      this.cidrBlockMask = Number(cidrBlock?.split('/')?.at(1));
    } else {
      const autoAllocatedCidrBlock = allocateCidrBlock({ seed: id });
      this.cidrBlock = autoAllocatedCidrBlock.cidrBlock;
      this.cidrBlockMask = autoAllocatedCidrBlock.networkMask;
    }

    const stackAzs = Stack.of(this).availabilityZones;
    const azCount = stackAzs.length;
    const maxSubnetCount = azCount * 3; // Allow 1 subnet type in each availability zone
    this.subnetMask = allocateSubnetMask(this.cidrBlockMask, maxSubnetCount);

    this.subnetConfiguration = [];

    if (internetAccess) {
      const privateSubnetConfig = {
        cidrMask: this.subnetMask,
        name: 'PrivateSubnet',
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
      };
      this.subnetConfiguration.push(privateSubnetConfig);
    }

    const publicSubnetConfig = {
      cidrMask: this.subnetMask,
      name: 'PublicSubnet',
      subnetType: ec2.SubnetType.PUBLIC
    };
    this.subnetConfiguration.push(publicSubnetConfig);
    
    const isolatedSubnetConfig = {
      cidrMask: this.subnetMask,
      name: 'IsolatedSubnet',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED
    };
    this.subnetConfiguration.push(isolatedSubnetConfig);

    this._vpc = new ec2.Vpc(this, constructId('vpc'), {
      cidr: this.cidrBlock,
      subnetConfiguration: this.subnetConfiguration
    });

    new CfnOutput(this, constructId('vpc', 'id'), {
      description: `${id}-vpc-id`,
      value: this.vpc.vpcId
    });
  }

  public requestPeeringConnection (requester: VpcInfo, accepter: VpcInfo, connectionId: string) {
    // We don't deconstruct parameters here to make it more readable
    const requesterIpRangeId = requester.ipRange.replace('/', '-').replace('.', '-');
    const accepterIpRangeId = accepter.ipRange.replace('/', '-').replace('.', '-');
    const peerPairId = `p-${requesterIpRangeId}-${accepterIpRangeId}`;
    const peerVpcId = new SSMParameterReader(this, ConstructIds.peerVpcParam(accepter.stackName), {
      parameterName: ResourceNames.peerVpcParamName(accepter.stackName),
      region: accepter.region
    });
    const peeringConnectionRequest = new ec2.CfnVPCPeeringConnection(
      this,
      ConstructIds.peeringConnectionRequest(peerPairId),
      {
        peerVpcId: peerVpcId.getParameterValue(),
        vpcId: this.vpc.vpcId,
        peerOwnerId: accepter.accountId,
        peerRegion: accepter.region
      }
    );
    const paramId = ConstructIds.paramId(peerPairId);
    new ssm.StringParameter(this, paramId, {
      parameterName: paramId,
      stringValue: peeringConnectionRequest.ref
    });
    this._requestedPeeringConnections.push(peeringConnectionRequest);
    this.addPeeringRoutes(peeringConnectionRequest.ref, accepter.ipRange, connectionId);
    new VpcPeerDnsResolution(this, ConstructIds.requesterDnsResolution(peerPairId), {
      peeringConnectionId: peeringConnectionRequest.ref,
      isRequester: true
    });
    return peeringConnectionRequest;
  }

  public acceptPeeringConnection (requester: VpcInfo, accepter: VpcInfo, connectionId: string) {
    const requesterIpRangeId = requester.ipRange.replace('/', '-').replace('.', '-');
    const accepterIpRangeId = accepter.ipRange.replace('/', '-').replace('.', '-');
    const peerPairId = `p-${requesterIpRangeId}-${accepterIpRangeId}`;
    const peerId = new SSMParameterReader(this, ConstructIds.peerIdParam(peerPairId), {
      parameterName: ResourceNames.peerIdParamName(peerPairId),
      region: requester.region
    });
    const peeringConnectionId = peerId.getParameterValue();
    this.addPeeringRoutes(peeringConnectionId, requester.ipRange, connectionId);
    new VpcPeerDnsResolution(this, ConstructIds.accepterDnsResolution(peerPairId), {
      peeringConnectionId: peeringConnectionId,
      isAccepter: true
    });
  }
  
  public acceptExternalPeeringConnection (requester: { ipRange: string, peerId: string }, accepter: VpcInfo) {
    const requesterIpRangeId = requester.ipRange.replace('/', '-').replace('.', '-');
    const accepterIpRangeId = accepter.ipRange.replace('/', '-').replace('.', '-');
    const peerPairId = `p-${requesterIpRangeId}-${accepterIpRangeId}`;
   
    this.addPeeringRoutes(requester.peerId, requester.ipRange, peerPairId);
    new VpcPeerDnsResolution(this, `${peerPairId}-accepter-dns-resolution`, {
      peeringConnectionId: requester.peerId,
      isAccepter: true
    });
  }

  public addPeeringRoutes (peerId: string, destinationCidrBlock: string, connectionId: string) {
    this.vpc.publicSubnets.forEach((ps, index) => {
      const { routeTable } = ps as ec2.Subnet;
      new ec2.CfnRoute(this, ConstructIds.peeredConnectionRoutePublic(index, connectionId), {
        routeTableId: routeTable.routeTableId,
        destinationCidrBlock,
        vpcPeeringConnectionId: peerId
      });
    });

    if (this.hasNatGateway) {
      this.vpc.privateSubnets.forEach((ps, index) => {
        const { routeTable } = ps as ec2.Subnet;
        new ec2.CfnRoute(this, ConstructIds.peeredConnectionRoutePrivate(index, connectionId), {
          routeTableId: routeTable.routeTableId,
          destinationCidrBlock,
          vpcPeeringConnectionId: peerId
        });
      });
    }

    this.vpc.isolatedSubnets.forEach((ps, index) => {
      const { routeTable } = ps as ec2.Subnet;
      new ec2.CfnRoute(this, ConstructIds.peeredConnectionRouteIsolated(index, connectionId), {
        routeTableId: routeTable.routeTableId,
        destinationCidrBlock,
        vpcPeeringConnectionId: peerId
      });
    });
  }

  public get vpc (): ec2.IVpc {
    return this._vpc;
  }
}