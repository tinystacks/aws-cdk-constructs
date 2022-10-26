import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export interface AlbProps {
  vpc: ec2.Vpc;
  applicationPort: number;
  healthCheckPath: string;
}

export class Alb extends Construct {
  
  public readonly albTargetGroup: elbv2.ApplicationTargetGroup;
  
  constructor (scope: Construct, id: string, props: AlbProps) {
    super (scope, id);

    const alb = new elbv2.ApplicationLoadBalancer(
      this,
      'alb',
      {
        vpc: props.vpc,
        vpcSubnets: { subnets: props.vpc.publicSubnets },
        internetFacing: true
      }
    );

    this.albTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      'alb-target-group',
      {
        port: props.applicationPort,
        vpc: props.vpc,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP
      }
    );

    this.albTargetGroup.configureHealthCheck({
      path: props.healthCheckPath,
      protocol: elbv2.Protocol.HTTP
    });

    const albListener = alb.addListener('alb-listener', {
      open: true,
      port: 80
    });

    albListener.addTargetGroups('alb-listener-target-group', {
      targetGroups: [this.albTargetGroup]
    });

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: alb.loadBalancerDnsName
    });
  
  }

  public get albTargetGroupThis (): elbv2.ApplicationTargetGroup {
    return this.albTargetGroup;
  }

}