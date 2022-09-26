import * as cdk from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { VPC } from '../../src/constructs/networking/vpc'

export class CreateVpc extends cdk.Stack {
    public readonly vpcId: string;
    public readonly vpc: IVpc;
    private _vpc: VPC;

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
      super(scope, id)

      this._vpc = new VPC(this, "vpc", {
        internetAccess: true
      })

      this.vpc = this._vpc.vpc
      
      new ssm.StringParameter(this, 'vpcId', {
        parameterName: 'vpcId',
        stringValue: this._vpc.vpc.vpcId
      })
    }

    
  }