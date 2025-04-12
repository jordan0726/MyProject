music_table_schema = {
    "KeySchema": [
        {"AttributeName": "title", "KeyType": "HASH"},  # Partition key
        {"AttributeName": "album", "KeyType": "RANGE"}  # Sort key
    ],
    "AttributeDefinitions": [
        {"AttributeName": "title", "AttributeType": "S"},
        {"AttributeName": "album", "AttributeType": "S"},
        {"AttributeName": "artist_lower", "AttributeType": "S"},  # For GSI
        {"AttributeName": "album_lower", "AttributeType": "S"},   # For GSI
        {"AttributeName": "year", "AttributeType": "S"}           # For GSI
    ],
    "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "ArtistAlbumIndex",
            "KeySchema": [
                {"AttributeName": "artist_lower", "KeyType": "HASH"},
                {"AttributeName": "album_lower", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
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
