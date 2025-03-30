import requests

from concurrent.futures import ThreadPoolExecutor, as_completed
from botocore.exceptions import ClientError
import boto3
import json

class S3Manager:
    def __init__(self, region='us-east-1'):
        self.s3_client = boto3.client('s3', region_name=region) # Create an S3 client
        self.region = region

    def create_s3_bucket(self, bucket_name:str) -> bool:
        """
        Creates an S3 bucket with the specified name and region.
        :param bucket_name: The name of the S3 bucket to create.
        :return: bool
        """
        try:
            if self.region == 'us-east-1':
                self.s3_client.create_bucket(Bucket=bucket_name)
            else: # For regions other than us-east-1, specify the location constraint, AWS require that.
                self.s3_client.create_bucket(
                    Bucket= bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': self.region}
                    )
            return True

        except ClientError as e:
            print(f"Failed to create bucket: {e}")
            return False

    def upload_from_url_to_bucket(self, img_url: str, bucket_name: str, s3_key: str) -> bool:
        """
        Uploads an image from a URL to the specified S3 bucket without saving it locally.
        :param img_url: The URL of the image to upload.
        :param bucket_name: The name of the S3 bucket.
        :param s3_key: The S3 object key (file path in S3).
        :return: bool
        """
        try:
            # Download image content as a stream to avoid loading the entire file into memory
            response = requests.get(img_url, stream=True, timeout=10)
            response.raise_for_status() # Raise an exception for any non-200 HTTP responses

            # Ensure raw content is decoded correctly, especially for compressed responses
            response.raw.decode_content = True

            self.s3_client.upload_fileobj(response.raw, bucket_name, s3_key)
            return True

        except Exception as e:
            print(f"❌ Failed to upload image from {img_url} to S3: {e}")
            return False

    def upload_img_from_json(self, json_file: str, bucket_name: str, max_workers: int =10) -> (bool, int):
        """
        Reads image URLs from a JSON file and uploads each image directly to S3 concurrently.
        Uses a pre-check of existing objects in S3 to avoid duplicate uploads.
        :param str json_file: The path to the JSON file containing song data.
                              Expected format:
                              {
                                  "songs": [
                                      {
                                          "artist": "Artist Name",
                                          "img_url": "https://example.com/image.jpg"
                                      },
                                      ...
                                  ]
                              }
        :param str bucket_name: The name of the destination S3 bucket.
        :param max_workers: Maximum number of threads to run concurrently.
        :return: bool, int (number of images being skipped)
        """
        try:
            # Load the JSON file
            with open(json_file, 'r', encoding='utf-8') as file:
                loaded_data = json.load(file)

            if 'songs' not in loaded_data or not isinstance(loaded_data['songs'], list):
                raise ValueError("Invalid JSON format: missing or incorrect 'songs' key.")

            songs = loaded_data['songs']
            tasks = []

            # Create an empty set to store the keys (filenames) of existing S3 objects, using to check duplicates in subsequent upload actions
            existing_keys = set()

            ## Call the S3 API to list objects in the bucket that start with the prefix 'artist-images/'
            response = self.s3_client.list_objects_v2(Bucket=bucket_name, Prefix='artist-images/')

            ## The API response is a dictionary. If there are any matching objects,
            ## it will include a key 'Contents', which is a list of objects.
            if 'Contents' in response:
                for obj in response['Contents']:
                    existing_keys.add(obj['Key'])

            # CHECK FOR FIRST RUN
            # Create a set to track keys already queued during this run
            queued_keys = set()
            skipped_count = 0

            # Set up a ThreadPoolExecutor to upload images concurrently
            # max_workers is the number of threads to run concurrently, default is 10
            with ThreadPoolExecutor(max_workers=max_workers) as executor:

                # Loop through each song in the list to get the image URL
                for each_song in songs:
                    img_url = each_song.get("img_url", None) # Get the image URL
                    artist = each_song.get("artist", "unknown").replace(" ", "_") # Get the artist name and replace spaces with underscores

                    if not img_url:
                        print(f"⚠️ Skipping {artist}: No image URL provided.")
                        continue

                    s3_key = f"artist-images/{artist}.jpg"

                    # First, check against S3 pre-fetched keys
                    if s3_key in existing_keys:
                        continue

                    # Then, check if this key has already been queued for upload during this run
                    if s3_key in queued_keys:
                        continue

                    # Mark this key as queued for upload
                    queued_keys.add(s3_key)

                    # Submit the upload task to the thread pool
                    task = executor.submit(self.upload_from_url_to_bucket, img_url, bucket_name, s3_key)
                    tasks.append(task)

                skipped_count = len(queued_keys) + len(existing_keys)

                # Wait for all tasks to complete
                for future in as_completed(tasks):
                    # The upload_from_url_to_bucket function prints its own success/failure messages.
                    pass

            return True, skipped_count

        except Exception as e:
            print(f"Error while processing JSON file: {e}")
            return False, 0

    def enable_block_public_access(self, bucket_name: str) -> bool:
        """
       Enables AWS S3's Block Public Access settings to fully restrict public access to the bucket.

       This setting prevents any accidental public exposure of bucket content, overriding any public ACLs or bucket policies.

       :param bucket_name: The name of the S3 bucket to secure.
       :return: bool
       """
        try:
            self.s3_client.put_public_access_block(
                Bucket=bucket_name,
                PublicAccessBlockConfiguration={
                    'BlockPublicAcls':True,
                    'IgnorePublicAcls':True,
                    'BlockPublicPolicy':True,
                    'RestrictPublicBuckets':True
                }
            )
            return True
        except ClientError as e:
            print(f"❌ Error setting public access block: {e}")
            return False

    def set_bucket_policy_block_public_access(self, bucket_name: str) -> bool:
        """
        Sets a bucket policy to deny public read access to objects via non-HTTPS requests.

        This policy ensures that all objects stored in the bucket can only be accessed securely using HTTPS.
        It's an extra layer of security to prevent accidental events of enable_block_public_access settings.

        :param bucket_name: The name of the S3 bucket to secure.
        :return: bool
        """

        # Define the bucket policy JSON
        s3_bucket_policy = {
            "Version": "2012-10-17", # Policy language version (AWS standard version)
            "Statement":[
                {
                    "Sid": "DenyPublicRead",
                    "Effect": "Deny",   # Explicitly deny access (as opposed to allow)
                    "Principal": "*",   # Applies to everyone (all anonymous users)
                    "Action": "s3:GetObject", # Action being denied (reading objects from bucket)
                    "Resource": f"arn:aws:s3:::{bucket_name}/*",
                    "Condition": {
                        "Bool": {
                            "aws:SecureTransport": "false" # Condition: deny if NOT using secure transport (HTTPS)
                        }
                    }
                }
            ]
        }

        s3_bucket_policy_json = json.dumps(s3_bucket_policy) # Convert the policy to a JSON string

        try:
            self.s3_client.put_bucket_policy(Bucket=bucket_name, Policy=s3_bucket_policy_json)
            return True
        except ClientError as e:
            print(f"❌ Failed to set bucket policy: {e}")
            return False



# To-do:
# 1. 現在一個歌手只能有一張圖，因為是用歌手名稱當作 key，如果有重複的歌手名稱，會跳過第二張圖


