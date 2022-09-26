import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { EKS } from '../../src/constructs/compute/eks-cluster'
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ALB } from '../../src/constructs/networking/alb'

export class EksStack extends cdk.Stack {
    private _vpcId: string;
    private _vpc: ec2.IVpc;
    private _eksCluster: EKS;
    private _alb: ALB;

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this._vpcId = ssm.StringParameter.valueFromLookup(this,
            'vpcId')

        this._vpc = ec2.Vpc.fromLookup(this, "vpcLookup", {
          vpcId: this._vpcId
        })

        this._eksCluster = new EKS(this, "testCluster", {
          vpc: this._vpc,
          internetAccess: true
        })

         this._alb = new ALB(this, "k8Vpc", {
          vpc: this._vpc,
          clusterName: this._eksCluster.clusterName,
          stackName: 'eksStack'
        } )

        new cdk.CfnOutput(this, 'albName', {
          value: this._alb.albName,
          description: 'The name of the k8 application load balancer.',
          exportName: 'albName'
        })

    }

}