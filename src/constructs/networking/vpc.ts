import { allocateCidrBlock, allocateSubnetMask, constructId } from '@tinystacks/utils';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface EcsVpcProps {
    cidrBlock?: string;
    internetAccess: boolean
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

    this.vpc.privateSubnets?.forEach((privateSubnet, index) => {
      new CfnOutput(this, constructId('privateSubnet', (index + 1).toString(), 'id'), {
        description: `private-subnet-${index + 1}-id`,
        value: privateSubnet.subnetId
      });
      new CfnOutput(this, constructId('privateSubnet', (index + 1).toString(), 'az'), {
        description: `private-subnet-${index + 1}-az`,
        value: privateSubnet.availabilityZone
      });
    });
  }

  public get vpc (): ec2.IVpc {
    return this._vpc;
  }
}