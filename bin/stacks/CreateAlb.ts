import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { VPC } from '../../src/constructs/networking/vpc'
import { ALB } from '../../src/constructs/networking/alb'
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class CreateAlb extends cdk.Stack {
  private _vpc: IVpc;
  private _vpcId: string;
  public readonly alb: ALB;
  private _clusterName: string;


  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this._vpcId = ssm.StringParameter.valueFromLookup(this,
      'vpcId')

    this._vpc = ec2.Vpc.fromLookup(this, "vpcLookup", {
      vpcId: this._vpcId
    })

    this._clusterName = ssm.StringParameter.valueFromLookup(this,
      'clusterName')

    this.alb = new ALB(this, "k8Vpc", {
      vpc: this._vpc,
      clusterName: this._clusterName,
      stackName: 'aws-load-balancer-controller'
    })
  }

}