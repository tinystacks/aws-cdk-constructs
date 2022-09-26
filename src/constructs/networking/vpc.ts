import { allocateCidrBlock, allocateSubnetMask, constructId } from '@tinystacks/iac-utils';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { randomUUID } from 'crypto';
import { VpcPeerDnsResolution } from './vpc-peer-dns-resolution';
import { VpcPeeringRequestAccepter } from './vpc-peering-request-accepter';
import { VpcPeeringRoutes } from './vpc-peering-routes';

interface ExternalVpcPeer {
  vpcId: string;
  cidrBlock: string;
  accountId?: string;
  region?: string;
}

export interface VpcProps {
    cidrBlock?: string;
    internetAccess: boolean;
    internalPeers?: VPC[];
    externalPeers?: ExternalVpcPeer[];
}

export class VPC extends Construct {
  private readonly _vpc: ec2.IVpc;
  private subnetConfiguration: { cidrMask: number; name: string; subnetType: ec2.SubnetType; }[];
  private readonly _cidrBlock: string;
  private cidrBlockMask: number;
  private subnetMask: number;
  private internetAccess: boolean;
  private accountId: string;
  private region: string;
    
  constructor (scope: Construct, id: string, props: VpcProps) {
    super(scope, id);
    
    const {
      cidrBlock,
      internetAccess,
      internalPeers,
      externalPeers
    } = props;
    
    this.accountId = Stack.of(this).account;
    this.region = Stack.of(this).region;

    if (cidrBlock) {
      this._cidrBlock = cidrBlock;
      this.cidrBlockMask = Number(cidrBlock?.split('/')?.at(1));
    } else {
      const autoAllocatedCidrBlock = allocateCidrBlock({ seed: id });
      this._cidrBlock = autoAllocatedCidrBlock.cidrBlock;
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

    if (internalPeers) {
      for (const internalPeer of internalPeers) {
        const connectionId = `${this.vpc.vpcId}-to-${internalPeer.vpc.vpcId}`;
        const peeringConnectionRequest = this.requestPeeringConnection(internalPeer, connectionId);
        const peeringConnectionId = peeringConnectionRequest.ref;
        internalPeer.acceptPeeringConnection(this, peeringConnectionId, connectionId);
      }
    }
    if (externalPeers) {
      for (const externalPeer of externalPeers) {
        const connectionId = `${this.vpc.vpcId}-to-${externalPeer.vpcId}`;
        const peeringConnectionRequest = this.requestExternalPeeringConnection(externalPeer, connectionId);
        const peeringConnectionId = peeringConnectionRequest.ref;
        this.acceptExternalPeeringConnection(externalPeer, peeringConnectionId, connectionId);
      }
    }
  }

  public requestPeeringConnection (peer: VPC, connectionId: string) {
    if (this.cidrBlock === peer.cidrBlock) {
      throw new Error('Cannot peer two vpcs with the same cidr block!');
    }

    const peerPairId = `vpc-peering-connection-${connectionId}`;
    const peeringConnectionRequest = new ec2.CfnVPCPeeringConnection(
      this,
      constructId(peerPairId),
      {
        peerVpcId: peer.vpc.vpcId,
        vpcId: this.vpc.vpcId
      }
    );
    this.addPeeringRoutes(peeringConnectionRequest.ref, peer.cidrBlock, connectionId);
    new VpcPeerDnsResolution(this, constructId(`requester-dns-resolution-${connectionId}`), {
      peeringConnectionId: peeringConnectionRequest.ref,
      vpcArn: this.vpc.vpcArn,
      accountId: this.accountId,
      region: this.region,
      isRequester: true
    });
    return peeringConnectionRequest;
  }

  public acceptPeeringConnection (requester: VPC, peeringConnectionId: string, connectionId: string) {
    this.addPeeringRoutes(peeringConnectionId, requester.cidrBlock, connectionId);
    new VpcPeerDnsResolution(this, constructId(`accepter-dns-resolution-${connectionId}`), {
      peeringConnectionId: peeringConnectionId,
      vpcArn: this.vpc.vpcArn,
      accountId: this.accountId,
      region: this.region,
      isAccepter: true
    });
  }
  
  public requestExternalPeeringConnection (peer: ExternalVpcPeer, connectionId: string) {
    if (this.cidrBlock === peer.cidrBlock) {
      throw new Error('Cannot peer two vpcs with the same cidr block!');
    }
    const peerPairId = `vpc-peering-connection-${connectionId}`;
    const peeringConnectionRequest = new ec2.CfnVPCPeeringConnection(
      this,
      constructId(peerPairId),
      {
        peerVpcId: peer.vpcId,
        vpcId: this.vpc.vpcId
      }
    );
    this.addPeeringRoutes(peeringConnectionRequest.ref, peer.cidrBlock, connectionId);
    new VpcPeerDnsResolution(this, constructId(`requester-dns-resolution-${connectionId}`), {
      peeringConnectionId: peeringConnectionRequest.ref,
      vpcArn: this.vpc.vpcArn,
      accountId: this.accountId,
      region: this.region,
      isRequester: true
    });
    return peeringConnectionRequest;
  }
  
  public acceptExternalPeeringConnection (peer: ExternalVpcPeer, peeringConnectionId: string, connectionId: string) {    
    const {
      accountId = this.accountId,
      region = this.region,
      vpcId
    } = peer;

    const externalVpcArn = `arn:aws:ec2:${region}:${accountId}:vpc/${vpcId}`;

    new VpcPeeringRequestAccepter(this, constructId('PeeringRequestAccepter', connectionId), {
      vpcArn: externalVpcArn,
      peeringConnectionId: peeringConnectionId,
      accountId,
      region
    });
    new VpcPeeringRoutes(this, constructId('ExternalVpcPeeringRoutes', connectionId), {
      vpcId: peer.vpcId,
      peeringConnectionId,
      destinationCidrBlock: this.cidrBlock,
      accountId,
      region,
      uniqueId: randomUUID()
    });
    new VpcPeerDnsResolution(this, constructId(`accepter-dns-resolution-${connectionId}`), {
      peeringConnectionId: peeringConnectionId,
      vpcArn: externalVpcArn,
      accountId,
      region,
      isAccepter: true
    });
  }

  public addPeeringRoutes (peeringConnectionId: string, destinationCidrBlock: string, connectionId: string) {
    this.vpc.publicSubnets.forEach((ps, index) => {
      const { routeTable } = ps as ec2.Subnet;
      new ec2.CfnRoute(this, constructId(`PublicPeeringRoute${index}-${connectionId}`), {
        routeTableId: routeTable.routeTableId,
        destinationCidrBlock,
        vpcPeeringConnectionId: peeringConnectionId
      });
    });

    if (this.internetAccess) {
      this.vpc.privateSubnets.forEach((ps, index) => {
        const { routeTable } = ps as ec2.Subnet;
        new ec2.CfnRoute(this, constructId(`PrivatePeeringRoute${index}-${connectionId}`), {
          routeTableId: routeTable.routeTableId,
          destinationCidrBlock,
          vpcPeeringConnectionId: peeringConnectionId
        });
      });
    }

    this.vpc.isolatedSubnets.forEach((ps, index) => {
      const { routeTable } = ps as ec2.Subnet;
      new ec2.CfnRoute(this, constructId(`IsolatedPeeringRoute${index}-${connectionId}`), {
        routeTableId: routeTable.routeTableId,
        destinationCidrBlock,
        vpcPeeringConnectionId: peeringConnectionId
      });
    });
  }

  public get vpc (): ec2.IVpc {
    return this._vpc;
  }
  public get cidrBlock (): string {
    return this._cidrBlock;
  }
}