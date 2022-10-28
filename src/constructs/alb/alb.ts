import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { constructId } from '@tinystacks/iac-utils';

export interface AlbProps {
  vpc: ec2.Vpc;
  applicationPort: number;
  healthCheckPath: string;
  albSecurityGroup: ec2.SecurityGroup;
}

export class Alb extends Construct {
  
  readonly albTargetGroup: elbv2.ApplicationTargetGroup;
  
  constructor (scope: Construct, id: string, props: AlbProps) {
    super (scope, id);

    const alb = new elbv2.ApplicationLoadBalancer(
      this,
      constructId('alb'),
      {
        vpc: props.vpc,
        vpcSubnets: { subnets: props.vpc.publicSubnets },
        internetFacing: true
      }
    );

    alb.addSecurityGroup(props.albSecurityGroup);

    this.albTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      constructId('alb', 'TargetGroup'),
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

    const albListener = alb.addListener(constructId('alb', 'Listener'), {
      open: true,
      port: 80
    });

    albListener.addTargetGroups(constructId('alb', 'Listener', 'TargetGroup'), {
      targetGroups: [this.albTargetGroup]
    });

    new cdk.CfnOutput(this, constructId('alb', 'DnsName'), {
      value: alb.loadBalancerDnsName
    });
  
  }

  public get albTargetGroupThis (): elbv2.ApplicationTargetGroup {
    return this.albTargetGroup;
  }

}