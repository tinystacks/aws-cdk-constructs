import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { VPC } from '../../src/constructs/networking/vpc'

export class CreateVpc extends cdk.Stack {
    public readonly vpcId: string;

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
      super(scope, id)
      
      new ssm.StringParameter(this, 'vpcId', {
        parameterName: 'vpcId',
        stringValue: new VPC(this, "vpc", {
          internetAccess: true
        }).vpc.vpcId
      })
    }

      // this.vpcId = new VPC(this, "vpc", {
      //       internetAccess: true
      //     }).vpc.vpcId
      //   }
  }