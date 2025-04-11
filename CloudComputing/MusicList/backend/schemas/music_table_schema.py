music_table_schema = {
    "KeySchema": [
        {"AttributeName": "title", "KeyType": "HASH"},  # Partition key
        {"AttributeName": "album", "KeyType": "RANGE"}    # Sort key
    ],
    "AttributeDefinitions": [
        {"AttributeName": "title", "AttributeType": "S"},
        {"AttributeName": "album", "AttributeType": "S"},
        {"AttributeName": "artist_lower", "AttributeType": "S"},  # New attribute for artist (normalized)
        {"AttributeName": "year", "AttributeType": "S"}  # New attribute for year
    ],
    "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "ArtistAlbumIndex",
            "KeySchema": [
                {"AttributeName": "artist_lower", "KeyType": "HASH"},  # Partition key for GSI
                {"AttributeName": "album", "KeyType": "RANGE"}          # Sort key for GSI
            ],
            "Projection": {"ProjectionType": "ALL"},  # Projects all attributes into the index
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        },
        {
            "IndexName": "ArtistYearIndex",
            "KeySchema": [
                {"AttributeName": "artist_lower", "KeyType": "HASH"},
                {"AttributeName": "year", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        }
    ]
}
