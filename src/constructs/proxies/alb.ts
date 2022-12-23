import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { constructId } from '@tinystacks/iac-utils';
import { SecurityGroups } from '../networking/securitygroups';

export interface AlbProps {
  vpc: ec2.IVpc;
  applicationPort: number;
  healthCheckPath: string;
  albSecurityGroup?: ec2.ISecurityGroup;
  listenerPort?: number;
  listenerCertificateArns?: string[];
}

export class Alb extends Construct {
  
  readonly _albTargetGroup: elbv2.ApplicationTargetGroup;
  readonly albSecurityGroup: ec2.SecurityGroup;
  private alb: elbv2.ApplicationLoadBalancer;
  
  constructor (scope: Construct, id: string, props: AlbProps) {
    super (scope, id);

    const albSecurityGroupRules = [
      { name: 'Internet to ALB', port: ec2.Port.tcp(props.listenerPort || 80), peer: ec2.Peer.anyIpv4() }
    ];

    const {
      albSecurityGroup = new SecurityGroups(this, constructId('alb', 'SecurityGroup'), {
        vpc: props.vpc,
        securityGroupName: 'albSecurityGroup',
        securityGroupRulesList: albSecurityGroupRules
      }).securityGroup
    } = props;

    this.alb = new elbv2.ApplicationLoadBalancer(
      this,
      constructId('alb'),
      {
        vpc: props.vpc,
        vpcSubnets: { subnets: props.vpc.publicSubnets },
        internetFacing: true,
        securityGroup: albSecurityGroup
      }
    );

    this._albTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      constructId('alb', 'TargetGroup'),
      {
        port: props.applicationPort,
        vpc: props.vpc,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP
      }
    );

    this._albTargetGroup.configureHealthCheck({
      path: props.healthCheckPath,
      protocol: elbv2.Protocol.HTTP
    });

    let certificates = undefined;
    if (props.listenerCertificateArns && props.listenerCertificateArns.length > 0) {
      certificates = props.listenerCertificateArns.map((certificateArn: string) => ({ certificateArn }));
    }

    const albListener = this.alb.addListener(constructId('alb', 'Listener'), {
      open: true,
      port: props.listenerPort || 80,
      certificates
    });

    albListener.addTargetGroups(constructId('alb', 'Listener', 'TargetGroup'), {
      targetGroups: [this._albTargetGroup]
    });

    new cdk.CfnOutput(this, constructId('alb', 'DnsName'), {
      value: this.alb.loadBalancerDnsName
    });
  
  }

  public get albTargetGroup (): elbv2.ApplicationTargetGroup {
    return this._albTargetGroup;
  }

  public getAlb (): elbv2.ApplicationLoadBalancer {
    return this.alb;
  }

}