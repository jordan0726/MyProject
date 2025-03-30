from backend.core.dynamo import DynamoManager  # Import only the class
from backend.core.s3 import S3Manager
from scripts import seed_data
from backend.schemas import login_table_schema, music_table_schema

def main():
    db = DynamoManager()
    json_file = '../data/2025a1.json'

    # TASK 1.1 -- Create a 'login' table and populate the user data
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

    # TASK 2 -- Download from img_url and upload images to S3
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


if __name__ == "__main__":
    main()  # Run the script


# Reference:
# S3 creating and upload file: https://docs.aws.amazon.com/code-library/latest/ug/python_3_s3_code_examples.html
# requests package: https://www.simplilearn.com/tutorials/python-tutorial/python-requests