import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { EKS } from '../../src/constructs/compute/eks-cluster'
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { CreateVpc } from './CreateVpc'

export class AlbStack extends cdk.Stack {
    private _vpc: IVpc
    private _eksCluster: EKS
    private _vpcId: string

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this._vpcId = ssm.StringParameter.valueFromLookup(this,
            'vpcId')

        console.log(this._vpcId)

        // this._vpc = ec2.Vpc.fromLookup(this, "vpcLookup", {
        //   vpcId: this._vpcId
        // })

        // this._eksCluster = new EKS(this, "testCluster", {
        //   vpc: this._vpc,
        //   internetAccess: true
        // })

        // new eks.EKS(app, "testCluster" ,{
        //   vpc
        // })
    }

}