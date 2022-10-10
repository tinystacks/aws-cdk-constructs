import { Construct } from 'constructs';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment'
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';


interface S3Props {
    bucketProps?: BucketProps
    existingBucketArn?: string
}

export class S3 extends Construct {
    public readonly _bucket: s3.IBucket
    private _id: string
    private _bucketProps: BucketProps | undefined

    constructor(scope: Construct, id: string, props: S3Props) {
        super(scope, id);

        const {
            existingBucketArn,
            bucketProps
        } = props
        this._id = id
        this._bucketProps = bucketProps

        if (existingBucketArn !== undefined) {
            this._bucket = s3.Bucket.fromBucketArn(this, `${id}-bucket`, existingBucketArn)
        } else {
            this._bucket = this.createBucket()
        }

    }

    private createBucket() {
        return new s3.Bucket(this, `${this._id}-bucket`, this._bucketProps)
    }

    public uploadSource(source: [s3Deployment.ISource], bucketKeyPrefix: string) {
        new s3Deployment.BucketDeployment(this, `${this._id}-fileUpload`, {
            sources: source,
            destinationBucket: this._bucket,
            destinationKeyPrefix: bucketKeyPrefix
        })
    }

    public get bucketArn(): string {
        return this._bucket.bucketArn
    }

    public get bucketName(): string {
        return this._bucket.bucketName
    }

}