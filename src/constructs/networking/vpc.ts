import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface EcsVpcProps {
    cidrBlock: string;
    vpcId?: string;
    natGateways?: number;
    internetAccess: boolean
}

export class VPC extends Construct {
  private vpc: ec2.IVpc;
  private subnetConfiguration: { cidrMask: number; name: string; subnetType: ec2.SubnetType; }[];
    
  constructor (scope: Construct, id: string, props: EcsVpcProps) {
    super(scope, `${id}-vpc`);
        
    const {
      cidrBlock
    } = props;

    const privateSubnet = [
      {
        cidrMask: 26,
        name: 'privateSubnet',
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
      }
    ];

    const publicSubnet = [
      {
        cidrMask: 26,
        name: 'publicSubnet',
        subnetType: ec2.SubnetType.PUBLIC
      }
    ];

    this.subnetConfiguration = privateSubnet;
    this.subnetConfiguration.push(publicSubnet[0]);

    this.vpc = new ec2.Vpc(this, `${id}-k8-vpc`, {
      cidr: cidrBlock,
      subnetConfiguration: this.subnetConfiguration
    });
  }

  getVpc (): ec2.IVpc {
    return this.vpc;
  }

}