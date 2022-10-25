import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { ALB } from '../../src/constructs/networking/alb'
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface CreateAlbProps extends cdk.StackProps {
  vpcSsmParamName: string
  clusterNameSsmParamName: string
}

/*
*This stack creates the ALB to be used with the ALB controller in K8.
*/
export class CreateAlb extends cdk.Stack {
  private _vpc: IVpc;
  private _vpcId: string;
  private _alb: ALB;
  private _clusterName: string;


  constructor(scope: cdk.App, id: string, props?: CreateAlbProps) {
    super(scope, id, props)

    const {
      vpcSsmParamName,
      clusterNameSsmParamName
    } = props

    this._vpcId = ssm.StringParameter.valueFromLookup(this,
      vpcSsmParamName)

    this._vpc = ec2.Vpc.fromLookup(this, "vpcLookup", {
      vpcId: this._vpcId
    })

    this._clusterName = ssm.StringParameter.valueFromLookup(this,
      clusterNameSsmParamName)

    this._alb = new ALB(this, "k8Vpc", {
      vpc: this._vpc,
      clusterName: this._clusterName,
      stackName: 'aws-load-balancer-controller'
    })

    //store alb name
    new ssm.StringParameter(this, `${id}-alb-id-param`, {
      parameterName: `${id}-alb-name`,
      stringValue: this._alb.albName
    })
  }

}