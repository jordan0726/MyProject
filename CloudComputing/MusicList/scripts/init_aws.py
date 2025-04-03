from backend.core.dynamo import DynamoManager  # Import only the class
from backend.core.s3 import S3Manager
from backend.core.ec2 import EC2Manager
from scripts import seed_data
from backend.schemas import login_table_schema, music_table_schema


def main():
    db = DynamoManager()
    json_file = '../data/2025a1.json'

    # TASK 1.1 -- Create a 'login' table in DynamoDB and populate the user data
    if db.create_table('login', login_table_schema):
        print("✅ Login table created.")
    else:
        print("⚠️ Login table already exists or failed to create.")

    user_dummy_data = seed_data.generate_dummy_login_data()
    for user in user_dummy_data:
        if db.insert_data("login", user):
            print(f"✅ Inserted user: {user['email']}")
        else:
            print(f"❌ Failed to insert user: {user['email']}")

    # TASK 1.2 -- create a table titled 'music'
    if db.create_table('music', music_table_schema):
        print("✅ Music table created.")
    else:
        print("⚠️ Music table already exists or failed to create.")

    # TASK1.3 -- Load data from json file
    if db.load_data_from_json_into_table('music', json_file, 'title', 'album'):
        print(f"✅ Loaded data from {json_file} into the 'music' table.")
    else:
        print(f"⚠️ Failed to load data from {json_file} into the 'music' table.")

    # TASK 2 -- Create S3 -- Download from img_url and upload images to S3
    s3_manager = S3Manager()
    bucket_name = 'media-storage-s4068959'
    ## Create a bucket
    if s3_manager.create_s3_bucket(bucket_name):
        print(f"✅ Created bucket: {bucket_name}")
    else:
        print(f"⚠️ Bucket '{bucket_name}' already exists or failed to create.")

    ## completely block public access to prevent any accidental public exposure
    if s3_manager.enable_block_public_access(bucket_name):
        print(f"✅ Enabled block public access for bucket: {bucket_name}")
    else:
        print(f"⚠️ Failed to enable block public access for bucket: {bucket_name}")

    ## set a more detailed bucket policy (e.g., enforcing HTTPS access)
    if s3_manager.set_bucket_policy_block_public_access(bucket_name):
        print(f"✅ Set bucket policy to block public access for bucket: {bucket_name}")
    else:
        print(f"⚠️ Failed to set bucket policy to block public access for bucket: {bucket_name}")

    ## Download and Upload images to S3
    succeed_upload, skipped_count = s3_manager.upload_img_from_json(json_file, bucket_name)
    if succeed_upload:
        print(f"✅ Uploaded images from {json_file} to S3 bucket: {bucket_name}")
        print(f"Skipped {skipped_count} images.")
    else:
        print(f"⚠️ Failed to upload images from {json_file} to S3 bucket: {bucket_name}")

    # Task3 Create EC2 to host website
    ec2_manager = EC2Manager()
    backend_instance_id, backend_public_dns = ec2_manager.create_backend_instance(
        ami_image= 'ami-084568db4383264d4', # Ubuntu 20.04
        instance_type = 't2.micro', # free tier
        key_name='vockey',
        security_group_ids=['sg-097c28d8eac2a3446']
    )
    print(f"Backend launched at http://{backend_public_dns} (ID: {backend_instance_id})")

    frontend_instance_id, frontend_public_dns = ec2_manager.create_frontend_instance(
        ami_image='ami-084568db4383264d4',
        instance_type='t2.micro',
        key_name='vockey',
        security_group_ids=['sg-097c28d8eac2a3446'],
    )
    print(f"Frontend launched at http://{frontend_public_dns} (ID: {frontend_instance_id})")


if __name__ == "__main__":
    main()  # Run the script
# ssh -i ~/.ssh/vockey.pem ubuntu@
# cat /var/log/cloud-init-output.log
# cd ~/MyProject/CloudComputing/MusicList/backend
# source venv/bin/activate
# pip list
# uvicorn main:app --host 0.0.0.0 --port 8000
# curl http://localhost:8000
# which nginx
# sudo nginx -v
# sudo nginx -t
# sudo systemctl restart nginx

# sudo apt update
# sudo apt install certbot python3-certbot-nginx -y
# sudo certbot --nginx -d jordan0726.duckdns.org
# sudo certbot renew --dry-run








