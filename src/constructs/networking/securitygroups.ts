import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs';

export interface SecurityGroupsProps {
  vpc: ec2.Vpc;
  securityGroupRulesList: any[];
}

export class SecurityGroupsStack extends Construct {

  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupsProps) {
      super(scope, id);

      this.securityGroup = new ec2.SecurityGroup(this, 'security-group', {
        vpc: props.vpc,
        allowAllOutbound: true,
        securityGroupName: 'SecurityGroup',
    });

    props.securityGroupRulesList.map(sg => {
      this.securityGroup.addIngressRule(ec2.Peer.ipv4(sg.peer), ec2.Port.tcp(sg.port));
     })

  
  }
}
