import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import { Construct } from 'constructs';

export interface RdsProps {
  vpc: ec2.Vpc;
  securityGroupsList: ec2.SecurityGroup[];
}

export class RdsStack extends Construct {

  readonly RdsInstance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: RdsProps) {
      super(scope, id);

      this.RdsInstance = new rds.DatabaseInstance(this, 'rds-instance', {
        engine: rds.DatabaseInstanceEngine.POSTGRES,
        vpc: props.vpc,
  
        allocatedStorage: 25,
        deletionProtection: false,
        
        databaseName: 'Testing',
        port: 3306,
        securityGroups: props.securityGroupsList
    });

  
  }
}
