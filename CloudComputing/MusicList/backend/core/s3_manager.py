# Third-party dependencies (Need to install via `pip install requests`)
import requests

from concurrent.futures import ThreadPoolExecutor, as_completed
from botocore.exceptions import ClientError
import os
import boto3
import json

class S3Manager:
    def __init__(self, region='us-east-1'):
        """
       Initializes the S3 client.

       :param str region: AWS region where the S3 bucket is created.
       """
        self.s3_client = boto3.client('s3', region_name=region) # Create an S3 client
        self.region = region

    def create_s3_bucket(self, bucket_name:str) -> None:
        """
        Creates an S3 bucket with the specified name and region.
        :param bucket_name: The name of the S3 bucket to create.
        :return: None
        """
        try:
            if self.region == 'us-east-1':
                self.s3_client.create_bucket(Bucket=bucket_name)
            else: # For regions other than us-east-1, specify the location constraint, AWS require that.
                self.s3_client.create_bucket(
                    Bucket= bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': self.region}
                    )
            print(f"✅ S3 bucket '{bucket_name}' created successfully in region {self.region}!")
        except self.s3_client.exceptions.BucketAlreadyOwnedByYou:
            print(f"⚠️ S3 bucket '{bucket_name}' already exists and is owned by you.")
        except self.s3_client.exceptions.BucketAlreadyExists:
            print(f"❌ S3 bucket '{bucket_name}' already exists and is owned by someone else. Choose a different name.")
        except Exception as e:
            print(f"❌ Failed to create bucket: {e}")

    def upload_from_url_to_bucket(self, img_url: str, bucket_name: str, s3_key: str) -> None:
        """
        Uploads an image from a URL to the specified S3 bucket without saving it locally.
        :param img_url: The URL of the image to upload.
        :param bucket_name: The name of the S3 bucket.
        :param s3_key: The S3 object key (file path in S3).
        :return: None
        """
        try:
            # Download image content as a stream to avoid loading the entire file into memory
            response = requests.get(img_url, stream=True, timeout=10)
            response.raise_for_status() # Raise an exception for any non-200 HTTP responses

            # Ensure raw content is decoded correctly, especially for compressed responses
            response.raw.decode_content = True

            self.s3_client.upload_fileobj(response.raw, bucket_name, s3_key)
            # print(f"📤 Successfully uploaded {img_url} to s3://{bucket_name}/{s3_key}")

        except Exception as e:
            print(f"❌ Failed to upload image from {img_url} to S3: {e}")

    def upload_img_from_json(self, json_file: str, bucket_name: str, max_workers: int =10) -> None:
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
        :return: None
        """
        try:
            # Load the JSON file
            with open(json_file, 'r', encoding='utf-8') as file:
                loaded_data = json.load(file)

            if 'songs' not in loaded_data or not isinstance(loaded_data['songs'], list):
                raise ValueError("❌ Invalid JSON format: 'songs' key is missing or is not a list.")

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
            print(f"ℹ️ Found {len(existing_keys)} existing objects in S3 with prefix 'artist-images/'")

            # CHECK FOR FIRST RUN
            # Create a set to track keys already queued during this run
            queued_keys = set()

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
                    # print(f"⏳ Queuing upload for {artist} from URL: {img_url}")

                    # First, check against S3 pre-fetched keys
                    if s3_key in existing_keys:
                        # print(f"⚠️ Skipping {artist}: S3 object already exists at '{s3_key}'")
                        continue

                    # Then, check if this key has already been queued for upload during this run
                    if s3_key in queued_keys:
                        # print(f"⚠️ Skipping {artist}: Duplicate entry in JSON file for key '{s3_key}'")
                        continue

                    # Mark this key as queued for upload
                    queued_keys.add(s3_key)

                    # Submit the upload task to the thread pool
                    task = executor.submit(self.upload_from_url_to_bucket, img_url, bucket_name, s3_key)
                    tasks.append(task)

                # Optionally wait for all tasks to complete
                for future in as_completed(tasks):
                    # The upload_from_url_to_bucket function prints its own success/failure messages.
                    pass
            print(f"⚠️ Total skipping '{len(existing_keys) + len(queued_keys)}' duplicate img_url entry in JSON file")
            print("✅ All uploads completed.")

        except Exception as e:
            print(f"❌ Error while processing JSON file: {e}")

    def enable_block_public_access(self, bucket_name: str) -> None:
        """
       Enables AWS S3's Block Public Access settings to fully restrict public access to the bucket.

       This setting prevents any accidental public exposure of bucket content, overriding any public ACLs or bucket policies.

       :param bucket_name: The name of the S3 bucket to secure.
       :return: None
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
            print(f"✅ Public access successfully blocked for bucket '{bucket_name}'!")

        except ClientError as e:
            print(f"❌ Error setting public access block: {e}")

    def set_bucket_policy_block_public_access(self, bucket_name: str) -> None:
        """
        Sets a bucket policy to deny public read access to objects via non-HTTPS requests.

        This policy ensures that all objects stored in the bucket can only be accessed securely using HTTPS.
        It's an extra layer of security to prevent accidental events of enable_block_public_access settings.

        :param bucket_name: The name of the S3 bucket to secure.
        :return: None
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
            print(f"✅ Bucket policy successfully set for bucket '{bucket_name}'!")
        except ClientError as e:
            print(f"❌ Failed to set bucket policy: {e}")






    def upload_local_file_to_bucket(self, file_path: str, bucket_name: str, s3_key: str) -> None:
        """
        Uploads a file to the specified S3 bucket.

        :param str file_path: Path to the local file.
        :param str bucket_name: S3 bucket where the file will be uploaded.
        :param str s3_key: The S3 object key (file path in S3).
        :return: None
        """
        try:
            self.s3_client.upload_file(file_path, bucket_name, s3_key)
            print(f"📤 Uploaded {file_path} to S3: s3://{bucket_name}/{s3_key}")
        except Exception as e:
            print(f"❌ Failed to upload {file_path} to S3: {e}")

    def download_locally_and_upload(self, json_file: str, bucket_name:str, local_folder: str = 'images') -> None:
        """
      Downloads artist images from the given JSON file and uploads them to an S3 bucket.

      :param str json_file: Path to the JSON file containing 'image_url' values.
      :param str bucket_name: Name of the S3 bucket to upload images to.
      :param str local_folder: Local directory to store downloaded images before upload.
      :return: None
      """
        try:
            with open(json_file, 'r', encoding="utf-8") as file:
                loaded_data = json.load(file) # Load the JSON file

            # Check if the JSON file contains a list of songs
            if 'songs' not in loaded_data or not isinstance(loaded_data['songs'], list):
                raise ValueError(f"❌ Invalid JSON format: Missing 'songs' key or it's not a list.")

            songs = loaded_data['songs']

            # Ensure the local folder exists
            if not os.path.exists(local_folder):
                os.makedirs(local_folder) # Create the local folder 'images' by default if it doesn't exist

            for each_song in songs:
                img_url = each_song.get("img_url", None) # if not exist return None
                artist = each_song.get("artist", "unknown").replace(" ", "_") # Replace spaces with underscores to clean the artist name

                if not img_url:
                    print(f"⚠️ Skipping {artist}: No image URL found.")
                    continue # Skip if no image URL is found

                # Determine file name to keep them in uniform format
                file_name = f"{artist}.jpg"
                file_path = os.path.join(local_folder, file_name)  # Local file path/artist.jpg

                # Check if the file already exists locally, reduce the download time. So we can delete s3 after end lab to reduce cost
                if os.path.exists(file_path):
                    print(f"⚠️ Skipping download: {file_name} already exists locally.")
                else:

                    try:
                        #Download the image
                        print(f"⬇️ Downloading {file_name} from {img_url}...")
                        response = requests.get(img_url, stream = True, timeout = 10) #Stream the response content, avoid loading the entire file into memory
                        response.raise_for_status()  # Raise error for bad response

                        with open(file_path, "wb") as img_file: # Open the file in binary write mode (good for img or video)
                            for chunk in response.iter_content(4096): # Write the content in 4KB chunks
                                img_file.write(chunk) # Write the chunk to the file directly, so won't occupy memory

                        print(f"✅ Successfully downloaded: {file_name}")

                    except requests.RequestException as e:
                        print(f"❌ Failed to download {img_url}: {e}")
                        continue

                # Upload the image to S3
                try:
                    ## Change the prefix here to categorize the images in S3
                    s3_key = f"artist-images/{file_name}" # S3 key: artist-images/artist.jpg

                    self.upload_file_to_bucket(file_path, bucket_name, s3_key)
                except Exception as e:
                    print(f"❌ Failed to upload {file_name} to S3: {e}")

        except Exception as e:
            print(f"❌ Error processing JSON: {e}")



