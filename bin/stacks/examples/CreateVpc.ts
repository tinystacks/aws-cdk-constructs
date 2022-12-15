import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { VPC } from '../../src/constructs/networking/vpc'

interface CreateVpcProps extends cdk.StackProps {
  internetAccess: boolean
}
/*
*This stack creates a VPC and stores the VPC ID in an ssm parameter.
*/
export class CreateVpc extends cdk.Stack{
    private _vpc: VPC;
    public readonly _vpcSsmParamName: string;
    private _internetAccess: boolean;

    constructor(scope: cdk.App, id: string, props: CreateVpcProps) {
      super(scope, id, props)

      this._internetAccess = props.internetAccess ?? true

      this._vpcSsmParamName = `${id}-vpc-id`
      this._vpc = new VPC(this, `${id}-vpc`, {
        internetAccess: this._internetAccess
      })
      
      new ssm.StringParameter(this, `${id}-vpc-id-param`, {
        parameterName: this._vpcSsmParamName,
        stringValue: this._vpc.vpc.vpcId
      })
      
    }
    public get ssmParameterName(): string {
      return this._vpcSsmParamName
    }
    public get internetAccess(): boolean {
      return this._internetAccess
    }

  }