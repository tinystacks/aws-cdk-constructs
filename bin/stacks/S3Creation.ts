
import * as cdk from 'aws-cdk-lib';
import { S3 } from '../../src/constructs/compute/s3';
import * as s3Deploymentment from 'aws-cdk-lib/aws-s3-deployment'

interface S3CreationProps extends cdk.StackProps {
    existingBucketArn: string | undefined
}

export class S3Creation extends cdk.Stack {
    constructor(scope: cdk.App, id: string, prop: S3CreationProps ){
        super(scope,id)

        const bucket = new S3(this, 'test', {existingBucketArn: prop.existingBucketArn ,bucketProps: {autoDeleteObjects: true, removalPolicy: cdk.RemovalPolicy.DESTROY }})
        // Path is from where cdk deploy is ran
        // Source types:
        // Local .zip file: s3Deployment.Source.asset('/path/to/local/file.zip')
        // Local directory: s3Deployment.Source.asset('/path/to/local/directory')
        // Another bucket: s3Deployment.Source.bucket(bucket, zipObjectKey)
        // String data: s3Deployment.Source.data('object-key.txt', 'hello, world!') (supports deploy-time values)
        // JSON data: s3Deployment.Source.jsonData('object-key.json', { json: 'object' }) (supports deploy-time values)

        bucket.uploadSource([s3Deploymentment.Source.asset("./bin/stacks/testUpload")], "testUpload")

        new cdk.CfnOutput(this, 'bucketName', {
            value: bucket._bucket.bucketName,
            description: 'The name of the s3 bucket',
            exportName: 's3BucketName',
          });
          new cdk.CfnOutput(this, 'bucketArn', {
            value: bucket._bucket.bucketArn,
            description: 'The arn of the s3 bucket',
            exportName: 's3BucketArn',
          });
    }
}