import { Construct } from 'constructs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { VPC } from './vpc'
import { constructId } from '@tinystacks/iac-utils';
import { IVpc } from 'aws-cdk-lib/aws-ec2';

export interface AlbProps {
    vpc: IVpc
    albName?: string
    internetAccess?: boolean
}

export class ALB extends Construct {

    private _alb: elbv2.ApplicationLoadBalancer

    constructor(scope: Construct, id: string, props: AlbProps) {
        super(scope, id)

        const {
            vpc,
            albName,
            internetAccess
        } = props

        const randomString = require('@types/randomstring');

        this._alb = new elbv2.ApplicationLoadBalancer(this, constructId('lb'), {
            vpc: vpc,
            loadBalancerName: albName ?? randomString.generate(7),
            
        })
    }
}