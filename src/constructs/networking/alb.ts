import { Construct } from 'constructs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { constructId } from '@tinystacks/iac-utils';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Tags } from 'aws-cdk-lib';

export interface AlbProps {
    vpc: IVpc
    clusterName: string
    stackName: string
    albName?: string
    internetAccess?: boolean
    securityGroup?: ISecurityGroup
    albVpcSubnets?: SubnetSelection
}

export class ALB extends Construct {

  private _alb: elbv2.ApplicationLoadBalancer;

  constructor (scope: Construct, id: string, props: AlbProps) {
    super(scope, id);

    const {
      vpc,
      albName,
      internetAccess,
      securityGroup,
      albVpcSubnets,
      clusterName,
      stackName
    } = props;
    // create alb
    this._alb = new elbv2.ApplicationLoadBalancer(this, constructId('lb'), {
      vpc: vpc,
      loadBalancerName: albName,
      internetFacing: internetAccess,
      securityGroup: securityGroup,
      vpcSubnets: albVpcSubnets
    });
    // tag
    Tags.of(this).add('ingress.k8s.aws/resource', 'LoadBalancer');
    Tags.of(this).add('elbv2.k8s.aws/cluster', clusterName);
    Tags.of(this).add('ingress.k8s.aws/stack', stackName);
  }
  public get albName (): string {
    return this._alb.loadBalancerName;
  }
}