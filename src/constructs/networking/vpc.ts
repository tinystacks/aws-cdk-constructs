import { allocateCidrBlock, constructId } from '@tinystacks/utils';
import { CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface EcsVpcProps {
    cidrBlock?: string;
    internetAccess: boolean
}

export class VPC extends Construct {
  private readonly _vpc: ec2.IVpc;
  private subnetConfiguration: { cidrMask: number; name: string; subnetType: ec2.SubnetType; }[];
    
  constructor (scope: Construct, id: string, props: EcsVpcProps) {
    super(scope, id);
        
    const {
      cidrBlock = allocateCidrBlock({ seed: id }).cidrBlock
    } = props;

    const privateSubnetConfig = {
      cidrMask: 26,
      name: 'PrivateSubnet',
      subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
    };

    const publicSubnetConfig = {
      cidrMask: 26,
      name: 'PublicSubnet',
      subnetType: ec2.SubnetType.PUBLIC
    };

    this.subnetConfiguration = [privateSubnetConfig, publicSubnetConfig];

    this._vpc = new ec2.Vpc(this, constructId('vpc'), {
      cidr: cidrBlock,
      subnetConfiguration: this.subnetConfiguration
    });

    new CfnOutput(this, constructId('vpc', 'id'), {
      description: `${id}-vpc-id`,
      value: this.vpc.vpcId
    });
  }

  public get vpc (): ec2.IVpc {
    return this._vpc;
  }
}