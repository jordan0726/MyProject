login_table_schema = {
    "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
    "AttributeDefinitions": [{"AttributeName": "email", "AttributeType": "S"}],
    "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
}

