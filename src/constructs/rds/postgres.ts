import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface RdsProps {
  vpc: ec2.Vpc;
  securityGroupsList: ec2.SecurityGroup[];
  instanceType: ec2.InstanceType;
  subnetType: ec2.SubnetType;
  databaseName: string;
  instanceIdentifier?: string;
  storageSize?: number;
  dbArn?: string;
  isImported?: boolean,
}

export class Rds extends Construct {

  readonly RdsInstance: rds.DatabaseInstance;

  constructor (scope: Construct, id: string, props: RdsProps) {
    super(scope, id);

    if (!props.isImported|| !props.dbArn) {

      this.RdsInstance = new rds.DatabaseInstance(this, 'rds-instance', {
        engine: rds.DatabaseInstanceEngine.POSTGRES,
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: props.subnetType
        },
        instanceType: props.instanceType,
        allocatedStorage: props.storageSize || 20,
        maxAllocatedStorage: (props.storageSize || 20) * 2,
        allowMajorVersionUpgrade: true,
        instanceIdentifier: props.instanceIdentifier,

        databaseName: props.databaseName,
        port: 5432,
        securityGroups: props.securityGroupsList
      });

      new cdk.CfnOutput(this, 'postgres-secret', {
        value: `${props.instanceIdentifier}-postgres-secret:${this.RdsInstance.secret?.secretArn}`
      });

      /* How to install @tinystacks/common?
      const dbSecretArnOutputId = OutputDescriptions.secretArn(props.instanceIdentifier);
      new cdk.CfnOutput(this, dbSecretArnOutputId, {
        description: dbSecretArnOutputId,
        value: this.RdsInstance.secret?.secretArn || ''
      });
      */

    } else {

      const identifier = props.dbArn.split('db:')[1];
      this.RdsInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this, 'postgres', {
        instanceIdentifier: identifier,
        instanceEndpointAddress: '',
        securityGroups: props.securityGroupsList,
        port: 5432
      }) as rds.DatabaseInstance;

    }
  
  }

  public get dbSecret () {
    return this.RdsInstance.secret;
  }

  public get db (): rds.DatabaseInstance {
    return this.RdsInstance;
  }

  public get instanceIdentifier (): string {
    return this.RdsInstance.instanceIdentifier;
  }

}