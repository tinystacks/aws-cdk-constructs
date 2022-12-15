import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import { constructId } from '@tinystacks/iac-utils';

export interface RdsProps {
  vpc: ec2.IVpc;
  securityGroupsList: ec2.ISecurityGroup[];
  instanceType: ec2.InstanceType;
  subnetType: ec2.SubnetType;
  databaseName?: string;
  databaseUsername?: string;
  databaseEngine?: any;
  databasePort?: number;
  instanceIdentifier: string;
  storageSize?: number;
  dbArn?: string;
  isImported?: boolean,
  backupRetention?: cdk.Duration
}

export class Rds extends Construct {

  readonly RdsInstance: rds.DatabaseInstance;
  readonly _databaseName: string;
  readonly _databaseUsername: string;

  constructor (scope: Construct, id: string, props: RdsProps) {
    super(scope, id);

    const {
      databasePort = 5432,
      databaseEngine = rds.DatabaseInstanceEngine.POSTGRES,
      databaseName = 'tstesting',
      databaseUsername = 'postgres'
    } = props;

    this._databaseName = databaseName;
    this._databaseUsername = databaseUsername;

    if (!props.isImported|| !props.dbArn) {

      this.RdsInstance = new rds.DatabaseInstance(this, constructId('rds', 'instance'), {
        engine: databaseEngine,
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: props.subnetType
        },
        instanceType: props.instanceType,
        allocatedStorage: props.storageSize || 20,
        maxAllocatedStorage: (props.storageSize || 20) * 2,
        allowMajorVersionUpgrade: true,
        instanceIdentifier: props.instanceIdentifier,

        databaseName: this._databaseName,
        port: databasePort,
        securityGroups: props.securityGroupsList, 
        backupRetention: props.backupRetention
      });

      new cdk.CfnOutput(this, 'db-secret', {
        value: `${props.instanceIdentifier}-db-secret:${this.RdsInstance.secret?.secretArn}`
      });

      new cdk.CfnOutput(this, 'db-endpoint-port', {
        value: `${this.RdsInstance.dbInstanceEndpointAddress}:${this.RdsInstance.dbInstanceEndpointPort}`
      });

      new cdk.CfnOutput(this, 'db-name', {
        value: `${this._databaseName}`
      });

      const dbSecretArnOutputId = Rds.OutputDescriptions.secretArn(props.instanceIdentifier);
      new cdk.CfnOutput(this, dbSecretArnOutputId, {
        description: dbSecretArnOutputId,
        value: this.RdsInstance.secret?.secretArn || ''
      });

    } else {

      const identifier = props.dbArn.split('db:')[1];
      this.RdsInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this, constructId('postgres'), {
        instanceIdentifier: identifier,
        instanceEndpointAddress: '',
        securityGroups: props.securityGroupsList,
        port: databasePort
      }) as rds.DatabaseInstance;

    }
  
  }

  public get dbSecret () {
    return this.RdsInstance.secret;
  }

  public get db (): rds.DatabaseInstance {
    return this.RdsInstance;
  }

  public get dbName () {
    return this._databaseName;
  }

  public get dbUsername () {
    return this._databaseUsername;
  }

  static OutputDescriptions: {
    secretArn: (instanceIdentifier: string) => string
  } = {
      secretArn (instanceIdentifier: string): string {
        return `${instanceIdentifier}-secret-arn`;
      }
    };

}