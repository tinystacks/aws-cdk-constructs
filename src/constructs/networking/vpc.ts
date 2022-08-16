import { constructId } from '@tinystacks/utils';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface EcsVpcProps {
    cidrBlock: string;
    vpcId?: string;
    natGateways?: number;
    internetAccess: boolean
}

export class VPC extends Construct {
  private readonly _vpc: ec2.IVpc;
  private subnetConfiguration: { cidrMask: number; name: string; subnetType: ec2.SubnetType; }[];
    
  constructor (scope: Construct, id: string, props: EcsVpcProps) {
    super(scope, constructId('vpc', 'construct', id));
        
    const {
      cidrBlock
    } = props;

    const privateSubnet = [
      {
        cidrMask: 26,
        name: 'PrivateSubnet',
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
      }
    ];

    const publicSubnet = [
      {
        cidrMask: 26,
        name: 'PublicSubnet',
        subnetType: ec2.SubnetType.PUBLIC
      }
    ];

    this.subnetConfiguration = privateSubnet;
    this.subnetConfiguration.push(publicSubnet[0]);

    this._vpc = new ec2.Vpc(this, constructId('vpc'), {
      cidr: cidrBlock,
      subnetConfiguration: this.subnetConfiguration
    });
  }

  public get vpc (): ec2.IVpc {
    return this._vpc;
  }

}