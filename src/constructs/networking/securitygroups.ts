import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { constructId } from '@tinystacks/iac-utils';

export interface SecurityGroupsProps {
  vpc: ec2.IVpc;
  securityGroupName: string;
  securityGroupRulesList: any[];
}

export class SecurityGroups extends Construct {

  public readonly securityGroup: ec2.SecurityGroup;

  constructor (scope: Construct, id: string, props: SecurityGroupsProps) {
    super (scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, constructId('security', 'group'), {
      vpc: props.vpc,
      allowAllOutbound: true,
      securityGroupName: props.securityGroupName
    });

    props.securityGroupRulesList.map((sg) => {
      this.securityGroup.addIngressRule(sg.peer, sg.port, sg.name);
    });
  
  }

}