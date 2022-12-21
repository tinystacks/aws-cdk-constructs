import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { ALB } from '../../../src/constructs/networking/alb'
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface CreateAlbProps extends cdk.StackProps {
  vpcId: string
  clusterName: string
}

/*
*This stack creates the ALB to be used with the ALB controller in K8.
*/
export class CreateAlb extends cdk.Stack {
  private _vpc: IVpc;
  private _alb: ALB;

  constructor(scope: cdk.App, id: string, props?: CreateAlbProps) {
    super(scope, id, props)

    const {
      vpcId,
      clusterName
    } = props

    this._vpc = ec2.Vpc.fromLookup(this, "vpcLookup", {
      vpcId: vpcId
    })

    this._alb = new ALB(this, "k8Vpc", {
      vpc: this._vpc,
      clusterName: clusterName,
      stackName: 'aws-load-balancer-controller'
    })

    //store alb name
    new ssm.StringParameter(this, `${id}-alb-id-param`, {
      parameterName: `${id}-alb-name`,
      stringValue: this._alb.albName
    })
  }

}