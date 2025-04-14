2025-04-14T12:12:27.084Z
INIT_START Runtime Version: python:3.13.v31	Runtime Version ARN: arn:aws:lambda:eu-north-1::runtime:f713ac0afb982fcdf9bac88eaa00c31352efae870b225c19f1603fe79159a6f1

INIT_START Runtime Version: python:3.13.v31 Runtime Version ARN: arn:aws:lambda:eu-north-1::runtime:f713ac0afb982fcdf9bac88eaa00c31352efae870b225c19f1603fe79159a6f1
2025-04-14T12:12:27.381Z
[INFO]	2025-04-14T12:12:27.380Z		Found credentials in environment variables.

[INFO] 2025-04-14T12:12:27.380Z Found credentials in environment variables.
2025-04-14T12:12:27.504Z
START RequestId: 2d3cd512-13d0-414e-af48-96e66eec3af7 Version: $LATEST

START RequestId: 2d3cd512-13d0-414e-af48-96e66eec3af7 Version: $LATEST
2025-04-14T12:12:27.505Z
[INFO]	2025-04-14T12:12:27.505Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Event received: 
{
    "resource": "/bookings/{id}",
    "path": "/bookings/booking_1744201462869_417",
    "httpMethod": "GET",
    "headers": {
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "Authorization": "Bearer eyJraWQiOiJNeVFzTG9KUTBvTG9vREJPVE8xamxYN1JoK1ZcL3VtRXdFTURqektPZnlGYz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIyMGRjYzljYy05MDUxLTcwNzUtNTZhYi1lYTQ5OWFkMDM3NmYiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1ub3J0aC0xLmFtYXpvbmF3cy5jb21cL2V1LW5vcnRoLTFfZ2VqV3lCNFpCIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjpmYWxzZSwiY3VzdG9tOmNvbXBhbnlJZCI6ImU3NGIyOTYxLWQ1ZTAtNDczOS04MDk1LTVmMWZiMGFjMWRjMiIsImNvZ25pdG86dXNlcm5hbWUiOiJhbGV4Iiwib3JpZ2luX2p0aSI6Ijc2MTMzMTIzLWQzZDctNDdhOS1hYTU5LTJmNWVmZDAzYjRkYiIsImF1ZCI6InJlNHFjNjltcGJjazh1ZjY5amQ1M29xcGEiLCJldmVudF9pZCI6ImNkNWM1ZmNhLTcwOGItNDVmYy1hMThmLTQ4OGJjNDFjOTM4NSIsImN1c3RvbTp1c2VyUm9sZSI6IlVzZXIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc0NDYzMDQxMSwibmFtZSI6IkFsZXgiLCJwaG9uZV9udW1iZXIiOiIrNDQ3MzA1NzQyOTI2IiwiZXhwIjoxNzQ0NjM0MDExLCJpYXQiOjE3NDQ2MzA0MTEsImp0aSI6IjJiN2FkM2UwLTJjN2ItNDk5Ni05ODFmLWRmNTU3MjkxMjZmNSIsImVtYWlsIjoiYmVuODEzMTkyQGdtYWlsLmNvbSJ9.cNq7978AaSfi4wx362awll9mqMZAAK5JOPbjnWnpzuU-ws0tqLzzzuvXXIj28ybJ2qNo4MKjUS_hON2BLxKX5jUmAPYAABJADq0ZRIgIrNarZM2B8gYGCsEwReDl6i-vKfqzo0WbTqbLgHef4ijD5_XzAekllYEKttG9Mr9Jbvh-n736rYdD1sACHloGJQABCJhftx5xH3M4DxdXZ-1DQxAmLHoM5pMtWO1mAJiPhI0AkCndEi2Vc0P2LINGNJUv9V9Dp8p1Sk4UHSFnH2MFSGEltFdvRCPX-DRSdMLPyjSC5_GBeNPmrZnYmjlABdqrkq9B5-YXlciFTjqgH7M56A",
        "content-type": "application/json",
        "Host": "4m3m7j8611.execute-api.eu-north-1.amazonaws.com",
        "origin": "http://localhost:3000",
        "priority": "u=1, i",
        "referer": "http://localhost:3000/",
        "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "\"Android\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "X-Amzn-Trace-Id": "Root=1-67fcfbaa-5ad3bad64284c2f30c298e74",
        "X-Forwarded-For": "5.68.185.253",
        "X-Forwarded-Port": "443",
        "X-Forwarded-Proto": "https"
    },
    "multiValueHeaders": {
        "accept": [
            "*/*"
        ],
        "accept-encoding": [
            "gzip, deflate, br, zstd"
        ],
        "accept-language": [
            "en-GB,en-US;q=0.9,en;q=0.8"
        ],
        "Authorization": [
            "Bearer eyJraWQiOiJNeVFzTG9KUTBvTG9vREJPVE8xamxYN1JoK1ZcL3VtRXdFTURqektPZnlGYz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIyMGRjYzljYy05MDUxLTcwNzUtNTZhYi1lYTQ5OWFkMDM3NmYiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1ub3J0aC0xLmFtYXpvbmF3cy5jb21cL2V1LW5vcnRoLTFfZ2VqV3lCNFpCIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjpmYWxzZSwiY3VzdG9tOmNvbXBhbnlJZCI6ImU3NGIyOTYxLWQ1ZTAtNDczOS04MDk1LTVmMWZiMGFjMWRjMiIsImNvZ25pdG86dXNlcm5hbWUiOiJhbGV4Iiwib3JpZ2luX2p0aSI6Ijc2MTMzMTIzLWQzZDctNDdhOS1hYTU5LTJmNWVmZDAzYjRkYiIsImF1ZCI6InJlNHFjNjltcGJjazh1ZjY5amQ1M29xcGEiLCJldmVudF9pZCI6ImNkNWM1ZmNhLTcwOGItNDVmYy1hMThmLTQ4OGJjNDFjOTM4NSIsImN1c3RvbTp1c2VyUm9sZSI6IlVzZXIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc0NDYzMDQxMSwibmFtZSI6IkFsZXgiLCJwaG9uZV9udW1iZXIiOiIrNDQ3MzA1NzQyOTI2IiwiZXhwIjoxNzQ0NjM0MDExLCJpYXQiOjE3NDQ2MzA0MTEsImp0aSI6IjJiN2FkM2UwLTJjN2ItNDk5Ni05ODFmLWRmNTU3MjkxMjZmNSIsImVtYWlsIjoiYmVuODEzMTkyQGdtYWlsLmNvbSJ9.cNq7978AaSfi4wx362awll9mqMZAAK5JOPbjnWnpzuU-ws0tqLzzzuvXXIj28ybJ2qNo4MKjUS_hON2BLxKX5jUmAPYAABJADq0ZRIgIrNarZM2B8gYGCsEwReDl6i-vKfqzo0WbTqbLgHef4ijD5_XzAekllYEKttG9Mr9Jbvh-n736rYdD1sACHloGJQABCJhftx5xH3M4DxdXZ-1DQxAmLHoM5pMtWO1mAJiPhI0AkCndEi2Vc0P2LINGNJUv9V9Dp8p1Sk4UHSFnH2MFSGEltFdvRCPX-DRSdMLPyjSC5_GBeNPmrZnYmjlABdqrkq9B5-YXlciFTjqgH7M56A"
        ],
        "content-type": [
            "application/json"
        ],
        "Host": [
            "4m3m7j8611.execute-api.eu-north-1.amazonaws.com"
        ],
        "origin": [
            "http://localhost:3000"
        ],
        "priority": [
            "u=1, i"
        ],
        "referer": [
            "http://localhost:3000/"
        ],
        "sec-ch-ua": [
            "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\""
        ],
        "sec-ch-ua-mobile": [
            "?1"
        ],
        "sec-ch-ua-platform": [
            "\"Android\""
        ],
        "sec-fetch-dest": [
            "empty"
        ],
        "sec-fetch-mode": [
            "cors"
        ],
        "sec-fetch-site": [
            "cross-site"
        ],
        "User-Agent": [
            "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        ],
        "X-Amzn-Trace-Id": [
            "Root=1-67fcfbaa-5ad3bad64284c2f30c298e74"
        ],
        "X-Forwarded-For": [
            "5.68.185.253"
        ],
        "X-Forwarded-Port": [
            "443"
        ],
        "X-Forwarded-Proto": [
            "https"
        ]
    },
    "queryStringParameters": null,
    "multiValueQueryStringParameters": null,
    "pathParameters": {
        "id": "booking_1744201462869_417"
    },
    "stageVariables": null,
    "requestContext": {
        "resourceId": "9r1f9h",
        "authorizer": {
            "claims": {
                "sub": "20dcc9cc-9051-7075-56ab-ea499ad0376f",
                "email_verified": "false",
                "iss": "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_gejWyB4ZB",
                "phone_number_verified": "false",
                "custom:companyId": "e74b2961-d5e0-4739-8095-5f1fb0ac1dc2",
                "cognito:username": "alex",
                "origin_jti": "76133123-d3d7-47a9-aa59-2f5efd03b4db",
                "aud": "re4qc69mpbck8uf69jd53oqpa",
                "event_id": "cd5c5fca-708b-45fc-a18f-488bc41c9385",
                "custom:userRole": "User",
                "token_use": "id",
                "auth_time": "1744630411",
                "name": "Alex",
                "phone_number": "+447305742926",
                "exp": "Mon Apr 14 12:33:31 UTC 2025",
                "iat": "Mon Apr 14 11:33:31 UTC 2025",
                "jti": "2b7ad3e0-2c7b-4996-981f-df55729126f5",
                "email": "ben813192@gmail.com"
            }
        },
        "resourcePath": "/bookings/{id}",
        "httpMethod": "GET",
        "extendedRequestId": "JAxCxHjVgi0EL7Q=",
        "requestTime": "14/Apr/2025:12:12:26 +0000",
        "path": "/prod/bookings/booking_1744201462869_417",
        "accountId": "229816860983",
        "protocol": "HTTP/1.1",
        "stage": "prod",
        "domainPrefix": "4m3m7j8611",
        "requestTimeEpoch": 1744632746967,
        "requestId": "607752de-6931-4a0c-8626-7d111ddfcc6c",
        "identity": {
            "cognitoIdentityPoolId": null,
            "accountId": null,
            "cognitoIdentityId": null,
            "caller": null,
            "sourceIp": "5.68.185.253",
            "principalOrgId": null,
            "accessKey": null,
            "cognitoAuthenticationType": null,
            "cognitoAuthenticationProvider": null,
            "userArn": null,
            "userAgent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
            "user": null
        },
        "domainName": "4m3m7j8611.execute-api.eu-north-1.amazonaws.com",
        "deploymentId": "khnkki",
        "apiId": "4m3m7j8611"
    },
    "body": null,
    "isBase64Encoded": false
}


[INFO] 2025-04-14T12:12:27.505Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Event received: {"resource": "/bookings/{id}", "path": "/bookings/booking_1744201462869_417", "httpMethod": "GET", "headers": {"accept": "*/*", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-GB,en-US;q=0.9,en;q=0.8", "Authorization": "Bearer eyJraWQiOiJNeVFzTG9KUTBvTG9vREJPVE8xamxYN1JoK1ZcL3VtRXdFTURqektPZnlGYz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIyMGRjYzljYy05MDUxLTcwNzUtNTZhYi1lYTQ5OWFkMDM3NmYiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1ub3J0aC0xLmFtYXpvbmF3cy5jb21cL2V1LW5vcnRoLTFfZ2VqV3lCNFpCIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjpmYWxzZSwiY3VzdG9tOmNvbXBhbnlJZCI6ImU3NGIyOTYxLWQ1ZTAtNDczOS04MDk1LTVmMWZiMGFjMWRjMiIsImNvZ25pdG86dXNlcm5hbWUiOiJhbGV4Iiwib3JpZ2luX2p0aSI6Ijc2MTMzMTIzLWQzZDctNDdhOS1hYTU5LTJmNWVmZDAzYjRkYiIsImF1ZCI6InJlNHFjNjltcGJjazh1ZjY5amQ1M29xcGEiLCJldmVudF9pZCI6ImNkNWM1ZmNhLTcwOGItNDVmYy1hMThmLTQ4OGJjNDFjOTM4NSIsImN1c3RvbTp1c2VyUm9sZSI6IlVzZXIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc0NDYzMDQxMSwibmFtZSI6IkFsZXgiLCJwaG9uZV9udW1iZXIiOiIrNDQ3MzA1NzQyOTI2IiwiZXhwIjoxNzQ0NjM0MDExLCJpYXQiOjE3NDQ2MzA0MTEsImp0aSI6IjJiN2FkM2UwLTJjN2ItNDk5Ni05ODFmLWRmNTU3MjkxMjZmNSIsImVtYWlsIjoiYmVuODEzMTkyQGdtYWlsLmNvbSJ9.cNq7978AaSfi4wx362awll9mqMZAAK5JOPbjnWnpzuU-ws0tqLzzzuvXXIj28ybJ2qNo4MKjUS_hON2BLxKX5jUmAPYAABJADq0ZRIgIrNarZM2B8gYGCsEwReDl6i-vKfqzo0WbTqbLgHef4ijD5_XzAekllYEKttG9Mr9Jbvh-n736rYdD1sACHloGJQABCJhftx5xH3M4DxdXZ-1DQxAmLHoM5pMtWO1mAJiPhI0AkCndEi2Vc0P2LINGNJUv9V9Dp8p1Sk4UHSFnH2MFSGEltFdvRCPX-DRSdMLPyjSC5_GBeNPmrZnYmjlABdqrkq9B5-YXlciFTjqgH7M56A", "content-type": "application/json", "Host": "4m3m7j8611.execute-api.eu-north-1.amazonaws.com", "origin": "http://localhost:3000", "priority": "u=1, i", "referer": "http://localhost:3000/", "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"", "sec-ch-ua-mobile": "?1", "sec-ch-ua-platform": "\"Android\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "cross-site", "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36", "X-Amzn-Trace-Id": "Root=1-67fcfbaa-5ad3bad64284c2f30c298e74", "X-Forwarded-For": "5.68.185.253", "X-Forwarded-Port": "443", "X-Forwarded-Proto": "https"}, "multiValueHeaders": {"accept": ["*/*"], "accept-encoding": ["gzip, deflate, br, zstd"], "accept-language": ["en-GB,en-US;q=0.9,en;q=0.8"], "Authorization": ["Bearer eyJraWQiOiJNeVFzTG9KUTBvTG9vREJPVE8xamxYN1JoK1ZcL3VtRXdFTURqektPZnlGYz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIyMGRjYzljYy05MDUxLTcwNzUtNTZhYi1lYTQ5OWFkMDM3NmYiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1ub3J0aC0xLmFtYXpvbmF3cy5jb21cL2V1LW5vcnRoLTFfZ2VqV3lCNFpCIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjpmYWxzZSwiY3VzdG9tOmNvbXBhbnlJZCI6ImU3NGIyOTYxLWQ1ZTAtNDczOS04MDk1LTVmMWZiMGFjMWRjMiIsImNvZ25pdG86dXNlcm5hbWUiOiJhbGV4Iiwib3JpZ2luX2p0aSI6Ijc2MTMzMTIzLWQzZDctNDdhOS1hYTU5LTJmNWVmZDAzYjRkYiIsImF1ZCI6InJlNHFjNjltcGJjazh1ZjY5amQ1M29xcGEiLCJldmVudF9pZCI6ImNkNWM1ZmNhLTcwOGItNDVmYy1hMThmLTQ4OGJjNDFjOTM4NSIsImN1c3RvbTp1c2VyUm9sZSI6IlVzZXIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc0NDYzMDQxMSwibmFtZSI6IkFsZXgiLCJwaG9uZV9udW1iZXIiOiIrNDQ3MzA1NzQyOTI2IiwiZXhwIjoxNzQ0NjM0MDExLCJpYXQiOjE3NDQ2MzA0MTEsImp0aSI6IjJiN2FkM2UwLTJjN2ItNDk5Ni05ODFmLWRmNTU3MjkxMjZmNSIsImVtYWlsIjoiYmVuODEzMTkyQGdtYWlsLmNvbSJ9.cNq7978AaSfi4wx362awll9mqMZAAK5JOPbjnWnpzuU-ws0tqLzzzuvXXIj28ybJ2qNo4MKjUS_hON2BLxKX5jUmAPYAABJADq0ZRIgIrNarZM2B8gYGCsEwReDl6i-vKfqzo0WbTqbLgHef4ijD5_XzAekllYEKttG9Mr9Jbvh-n736rYdD1sACHloGJQABCJhftx5xH3M4DxdXZ-1DQxAmLHoM5pMtWO1mAJiPhI0AkCndEi2Vc0P2LINGNJUv9V9Dp8p1Sk4UHSFnH2MFSGEltFdvRCPX-DRSdMLPyjSC5_GBeNPmrZnYmjlABdqrkq9B5-YXlciFTjqgH7M56A"], "content-type": ["application/json"], "Host": ["4m3m7j8611.execute-api.eu-north-1.amazonaws.com"], "origin": ["http://localhost:3000"], "priority": ["u=1, i"], "referer": ["http://localhost:3000/"], "sec-ch-ua": ["\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\""], "sec-ch-ua-mobile": ["?1"], "sec-ch-ua-platform": ["\"Android\""], "sec-fetch-dest": ["empty"], "sec-fetch-mode": ["cors"], "sec-fetch-site": ["cross-site"], "User-Agent": ["Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"], "X-Amzn-Trace-Id": ["Root=1-67fcfbaa-5ad3bad64284c2f30c298e74"], "X-Forwarded-For": ["5.68.185.253"], "X-Forwarded-Port": ["443"], "X-Forwarded-Proto": ["https"]}, "queryStringParameters": null, "multiValueQueryStringParameters": null, "pathParameters": {"id": "booking_1744201462869_417"}, "stageVariables": null, "requestContext": {"resourceId": "9r1f9h", "authorizer": {"claims": {"sub": "20dcc9cc-9051-7075-56ab-ea499ad0376f", "email_verified": "false", "iss": "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_gejWyB4ZB", "phone_number_verified": "false", "custom:companyId": "e74b2961-d5e0-4739-8095-5f1fb0ac1dc2", "cognito:username": "alex", "origin_jti": "76133123-d3d7-47a9-aa59-2f5efd03b4db", "aud": "re4qc69mpbck8uf69jd53oqpa", "event_id": "cd5c5fca-708b-45fc-a18f-488bc41c9385", "custom:userRole": "User", "token_use": "id", "auth_time": "1744630411", "name": "Alex", "phone_number": "+447305742926", "exp": "Mon Apr 14 12:33:31 UTC 2025", "iat": "Mon Apr 14 11:33:31 UTC 2025", "jti": "2b7ad3e0-2c7b-4996-981f-df55729126f5", "email": "ben813192@gmail.com"}}, "resourcePath": "/bookings/{id}", "httpMethod": "GET", "extendedRequestId": "JAxCxHjVgi0EL7Q=", "requestTime": "14/Apr/2025:12:12:26 +0000", "path": "/prod/bookings/booking_1744201462869_417", "accountId": "229816860983", "protocol": "HTTP/1.1", "stage": "prod", "domainPrefix": "4m3m7j8611", "requestTimeEpoch": 1744632746967, "requestId": "607752de-6931-4a0c-8626-7d111ddfcc6c", "identity": {"cognitoIdentityPoolId": null, "accountId": null, "cognitoIdentityId": null, "caller": null, "sourceIp": "5.68.185.253", "principalOrgId": null, "accessKey": null, "cognitoAuthenticationType": null, "cognitoAuthenticationProvider": null, "userArn": null, "userAgent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36", "user": null}, "domainName": "4m3m7j8611.execute-api.eu-north-1.amazonaws.com", "deploymentId": "khnkki", "apiId": "4m3m7j8611"}, "body": null, "isBase64Encoded": false}
2025-04-14T12:12:27.505Z
[INFO]	2025-04-14T12:12:27.505Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Auth header: Bearer eyJraWQiOiJNe...

[INFO] 2025-04-14T12:12:27.505Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Auth header: Bearer eyJraWQiOiJNe...
2025-04-14T12:12:27.505Z
[INFO]	2025-04-14T12:12:27.505Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Path parameters: 
{
    "id": "booking_1744201462869_417"
}


[INFO] 2025-04-14T12:12:27.505Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Path parameters: {"id": "booking_1744201462869_417"}
2025-04-14T12:12:27.505Z
[INFO]	2025-04-14T12:12:27.505Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Query parameters: 
{}


[INFO] 2025-04-14T12:12:27.505Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Query parameters: {}
2025-04-14T12:12:27.505Z
[INFO]	2025-04-14T12:12:27.505Z	2d3cd512-13d0-414e-af48-96e66eec3af7	📌 Found booking ID from path parameter 'id': booking_1744201462869_417

[INFO] 2025-04-14T12:12:27.505Z 2d3cd512-13d0-414e-af48-96e66eec3af7 📌 Found booking ID from path parameter 'id': booking_1744201462869_417
2025-04-14T12:12:27.505Z
[INFO]	2025-04-14T12:12:27.505Z	2d3cd512-13d0-414e-af48-96e66eec3af7	✅ Using booking ID: booking_1744201462869_417

[INFO] 2025-04-14T12:12:27.505Z 2d3cd512-13d0-414e-af48-96e66eec3af7 ✅ Using booking ID: booking_1744201462869_417
2025-04-14T12:12:27.821Z
[INFO]	2025-04-14T12:12:27.821Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Successfully found booking with BookingId: booking_1744201462869_417

[INFO] 2025-04-14T12:12:27.821Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Successfully found booking with BookingId: booking_1744201462869_417
2025-04-14T12:12:27.821Z
[INFO]	2025-04-14T12:12:27.821Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Fetching images for booking: booking_1744201462869_417

[INFO] 2025-04-14T12:12:27.821Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Fetching images for booking: booking_1744201462869_417
2025-04-14T12:12:27.821Z
[INFO]	2025-04-14T12:12:27.821Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Fetching all files from Resources table...

[INFO] 2025-04-14T12:12:27.821Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Fetching all files from Resources table...
2025-04-14T12:12:27.900Z
[INFO]	2025-04-14T12:12:27.900Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Found 1 resources in Resources table

[INFO] 2025-04-14T12:12:27.900Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Found 1 resources in Resources table
2025-04-14T12:12:28.200Z
[INFO]	2025-04-14T12:12:28.200Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Generated presigned URL for booking_1744201462869_417/DJI_0242.JPG

[INFO] 2025-04-14T12:12:28.200Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Generated presigned URL for booking_1744201462869_417/DJI_0242.JPG
2025-04-14T12:12:28.200Z
[INFO]	2025-04-14T12:12:28.200Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Total resources found for booking booking_1744201462869_417: 1

[INFO] 2025-04-14T12:12:28.200Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Total resources found for booking booking_1744201462869_417: 1
2025-04-14T12:12:28.200Z
[INFO]	2025-04-14T12:12:28.200Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Fetching GeoTIFF data for booking: booking_1744201462869_417

[INFO] 2025-04-14T12:12:28.200Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Fetching GeoTIFF data for booking: booking_1744201462869_417
2025-04-14T12:12:28.240Z
[INFO]	2025-04-14T12:12:28.240Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Checking GeoTiffChunks table for completed reassemblies...

[INFO] 2025-04-14T12:12:28.240Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Checking GeoTiffChunks table for completed reassemblies...
2025-04-14T12:12:28.279Z
[INFO]	2025-04-14T12:12:28.279Z	2d3cd512-13d0-414e-af48-96e66eec3af7	[DEBUG] GeoTiffChunks scan result: found 1 items matching the criteria

[INFO] 2025-04-14T12:12:28.279Z 2d3cd512-13d0-414e-af48-96e66eec3af7 [DEBUG] GeoTiffChunks scan result: found 1 items matching the criteria
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Found 1 completed reassemblies in GeoTiffChunks table

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Found 1 completed reassemblies in GeoTiffChunks table
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	[DEBUG] Reassembly 1:

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 [DEBUG] Reassembly 1:
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	  - chunkId: 1744626247023_manifest

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 - chunkId: 1744626247023_manifest
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	  - sessionId: N/A

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 - sessionId: N/A
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	  - completedAt: 1744626259

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 - completedAt: 1744626259
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	  - finalResourceId: geotiff_1744626257_db85f41f

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 - finalResourceId: geotiff_1744626257_db85f41f
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	  - Has reassembledUrl: Yes

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 - Has reassembledUrl: Yes
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	  - reassembledUrl length: 1387, preview: https://pilotforce-resources.s3.amazonaws.com/book...

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 - reassembledUrl length: 1387, preview: https://pilotforce-resources.s3.amazonaws.com/book...
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	Using reassembled GeoTIFF with resource ID: geotiff_1744626257_db85f41f

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 Using reassembled GeoTIFF with resource ID: geotiff_1744626257_db85f41f
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	[DEBUG] Extracting S3 key from reassembledUrl: https://pilotforce-resources.s3.amazonaws.com/book...

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 [DEBUG] Extracting S3 key from reassembledUrl: https://pilotforce-resources.s3.amazonaws.com/book...
2025-04-14T12:12:28.280Z
[INFO]	2025-04-14T12:12:28.280Z	2d3cd512-13d0-414e-af48-96e66eec3af7	[DEBUG] Extracted S3 key from URL: booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif

[INFO] 2025-04-14T12:12:28.280Z 2d3cd512-13d0-414e-af48-96e66eec3af7 [DEBUG] Extracted S3 key from URL: booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif
2025-04-14T12:12:28.320Z
[INFO]	2025-04-14T12:12:28.320Z	2d3cd512-13d0-414e-af48-96e66eec3af7	[DEBUG] Verified GeoTIFF exists in S3: booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif

[INFO] 2025-04-14T12:12:28.320Z 2d3cd512-13d0-414e-af48-96e66eec3af7 [DEBUG] Verified GeoTIFF exists in S3: booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif
2025-04-14T12:12:28.320Z
[INFO]	2025-04-14T12:12:28.320Z	2d3cd512-13d0-414e-af48-96e66eec3af7	[DEBUG] Returning GeoTIFF data: 
{
    "filename": "Reassembled GeoTIFF",
    "url": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8",
    "presignedUrl": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8",
    "key": "booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif",
    "uploadDate": 1744626259,
    "resourceId": "geotiff_1744626257_db85f41f",
    "isReassembled": true,
    "sessionId": ""
}


[INFO] 2025-04-14T12:12:28.320Z 2d3cd512-13d0-414e-af48-96e66eec3af7 [DEBUG] Returning GeoTIFF data: {"filename": "Reassembled GeoTIFF", "url": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8", "presignedUrl": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8", "key": "booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif", "uploadDate": 1744626259, "resourceId": "geotiff_1744626257_db85f41f", "isReassembled": true, "sessionId": ""}
2025-04-14T12:12:28.340Z
END RequestId: 2d3cd512-13d0-414e-af48-96e66eec3af7

END RequestId: 2d3cd512-13d0-414e-af48-96e66eec3af7
2025-04-14T12:12:28.340Z
REPORT RequestId: 2d3cd512-13d0-414e-af48-96e66eec3af7	Duration: 835.47 ms	Billed Duration: 836 ms	Memory Size: 128 MB	Max Memory Used: 89 MB	Init Duration: 416.64 ms	

REPORT RequestId: 2d3cd512-13d0-414e-af48-96e66eec3af7 Duration: 835.47 ms Billed Duration: 836 ms Memory Size: 128 MB Max Memory Used: 89 MB Init Duration: 416.64 ms
2025-04-14T12:12:28.388Z
START RequestId: 2b65300f-e2d7-4755-b0a9-4a111428276d Version: $LATEST

START RequestId: 2b65300f-e2d7-4755-b0a9-4a111428276d Version: $LATEST
2025-04-14T12:12:28.389Z
[INFO]	2025-04-14T12:12:28.389Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Event received: 
{
    "resource": "/bookings/{id}",
    "path": "/bookings/booking_1744201462869_417",
    "httpMethod": "GET",
    "headers": {
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "Authorization": "Bearer eyJraWQiOiJNeVFzTG9KUTBvTG9vREJPVE8xamxYN1JoK1ZcL3VtRXdFTURqektPZnlGYz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIyMGRjYzljYy05MDUxLTcwNzUtNTZhYi1lYTQ5OWFkMDM3NmYiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1ub3J0aC0xLmFtYXpvbmF3cy5jb21cL2V1LW5vcnRoLTFfZ2VqV3lCNFpCIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjpmYWxzZSwiY3VzdG9tOmNvbXBhbnlJZCI6ImU3NGIyOTYxLWQ1ZTAtNDczOS04MDk1LTVmMWZiMGFjMWRjMiIsImNvZ25pdG86dXNlcm5hbWUiOiJhbGV4Iiwib3JpZ2luX2p0aSI6Ijc2MTMzMTIzLWQzZDctNDdhOS1hYTU5LTJmNWVmZDAzYjRkYiIsImF1ZCI6InJlNHFjNjltcGJjazh1ZjY5amQ1M29xcGEiLCJldmVudF9pZCI6ImNkNWM1ZmNhLTcwOGItNDVmYy1hMThmLTQ4OGJjNDFjOTM4NSIsImN1c3RvbTp1c2VyUm9sZSI6IlVzZXIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc0NDYzMDQxMSwibmFtZSI6IkFsZXgiLCJwaG9uZV9udW1iZXIiOiIrNDQ3MzA1NzQyOTI2IiwiZXhwIjoxNzQ0NjM0MDExLCJpYXQiOjE3NDQ2MzA0MTEsImp0aSI6IjJiN2FkM2UwLTJjN2ItNDk5Ni05ODFmLWRmNTU3MjkxMjZmNSIsImVtYWlsIjoiYmVuODEzMTkyQGdtYWlsLmNvbSJ9.cNq7978AaSfi4wx362awll9mqMZAAK5JOPbjnWnpzuU-ws0tqLzzzuvXXIj28ybJ2qNo4MKjUS_hON2BLxKX5jUmAPYAABJADq0ZRIgIrNarZM2B8gYGCsEwReDl6i-vKfqzo0WbTqbLgHef4ijD5_XzAekllYEKttG9Mr9Jbvh-n736rYdD1sACHloGJQABCJhftx5xH3M4DxdXZ-1DQxAmLHoM5pMtWO1mAJiPhI0AkCndEi2Vc0P2LINGNJUv9V9Dp8p1Sk4UHSFnH2MFSGEltFdvRCPX-DRSdMLPyjSC5_GBeNPmrZnYmjlABdqrkq9B5-YXlciFTjqgH7M56A",
        "content-type": "application/json",
        "Host": "4m3m7j8611.execute-api.eu-north-1.amazonaws.com",
        "origin": "http://localhost:3000",
        "priority": "u=1, i",
        "referer": "http://localhost:3000/",
        "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "\"Android\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "X-Amzn-Trace-Id": "Root=1-67fcfbac-3ae479d84c8323c433a8bf89",
        "X-Forwarded-For": "5.68.185.253",
        "X-Forwarded-Port": "443",
        "X-Forwarded-Proto": "https"
    },
    "multiValueHeaders": {
        "accept": [
            "*/*"
        ],
        "accept-encoding": [
            "gzip, deflate, br, zstd"
        ],
        "accept-language": [
            "en-GB,en-US;q=0.9,en;q=0.8"
        ],
        "Authorization": [
            "Bearer eyJraWQiOiJNeVFzTG9KUTBvTG9vREJPVE8xamxYN1JoK1ZcL3VtRXdFTURqektPZnlGYz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIyMGRjYzljYy05MDUxLTcwNzUtNTZhYi1lYTQ5OWFkMDM3NmYiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1ub3J0aC0xLmFtYXpvbmF3cy5jb21cL2V1LW5vcnRoLTFfZ2VqV3lCNFpCIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjpmYWxzZSwiY3VzdG9tOmNvbXBhbnlJZCI6ImU3NGIyOTYxLWQ1ZTAtNDczOS04MDk1LTVmMWZiMGFjMWRjMiIsImNvZ25pdG86dXNlcm5hbWUiOiJhbGV4Iiwib3JpZ2luX2p0aSI6Ijc2MTMzMTIzLWQzZDctNDdhOS1hYTU5LTJmNWVmZDAzYjRkYiIsImF1ZCI6InJlNHFjNjltcGJjazh1ZjY5amQ1M29xcGEiLCJldmVudF9pZCI6ImNkNWM1ZmNhLTcwOGItNDVmYy1hMThmLTQ4OGJjNDFjOTM4NSIsImN1c3RvbTp1c2VyUm9sZSI6IlVzZXIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc0NDYzMDQxMSwibmFtZSI6IkFsZXgiLCJwaG9uZV9udW1iZXIiOiIrNDQ3MzA1NzQyOTI2IiwiZXhwIjoxNzQ0NjM0MDExLCJpYXQiOjE3NDQ2MzA0MTEsImp0aSI6IjJiN2FkM2UwLTJjN2ItNDk5Ni05ODFmLWRmNTU3MjkxMjZmNSIsImVtYWlsIjoiYmVuODEzMTkyQGdtYWlsLmNvbSJ9.cNq7978AaSfi4wx362awll9mqMZAAK5JOPbjnWnpzuU-ws0tqLzzzuvXXIj28ybJ2qNo4MKjUS_hON2BLxKX5jUmAPYAABJADq0ZRIgIrNarZM2B8gYGCsEwReDl6i-vKfqzo0WbTqbLgHef4ijD5_XzAekllYEKttG9Mr9Jbvh-n736rYdD1sACHloGJQABCJhftx5xH3M4DxdXZ-1DQxAmLHoM5pMtWO1mAJiPhI0AkCndEi2Vc0P2LINGNJUv9V9Dp8p1Sk4UHSFnH2MFSGEltFdvRCPX-DRSdMLPyjSC5_GBeNPmrZnYmjlABdqrkq9B5-YXlciFTjqgH7M56A"
        ],
        "content-type": [
            "application/json"
        ],
        "Host": [
            "4m3m7j8611.execute-api.eu-north-1.amazonaws.com"
        ],
        "origin": [
            "http://localhost:3000"
        ],
        "priority": [
            "u=1, i"
        ],
        "referer": [
            "http://localhost:3000/"
        ],
        "sec-ch-ua": [
            "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\""
        ],
        "sec-ch-ua-mobile": [
            "?1"
        ],
        "sec-ch-ua-platform": [
            "\"Android\""
        ],
        "sec-fetch-dest": [
            "empty"
        ],
        "sec-fetch-mode": [
            "cors"
        ],
        "sec-fetch-site": [
            "cross-site"
        ],
        "User-Agent": [
            "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        ],
        "X-Amzn-Trace-Id": [
            "Root=1-67fcfbac-3ae479d84c8323c433a8bf89"
        ],
        "X-Forwarded-For": [
            "5.68.185.253"
        ],
        "X-Forwarded-Port": [
            "443"
        ],
        "X-Forwarded-Proto": [
            "https"
        ]
    },
    "queryStringParameters": null,
    "multiValueQueryStringParameters": null,
    "pathParameters": {
        "id": "booking_1744201462869_417"
    },
    "stageVariables": null,
    "requestContext": {
        "resourceId": "9r1f9h",
        "authorizer": {
            "claims": {
                "sub": "20dcc9cc-9051-7075-56ab-ea499ad0376f",
                "email_verified": "false",
                "iss": "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_gejWyB4ZB",
                "phone_number_verified": "false",
                "custom:companyId": "e74b2961-d5e0-4739-8095-5f1fb0ac1dc2",
                "cognito:username": "alex",
                "origin_jti": "76133123-d3d7-47a9-aa59-2f5efd03b4db",
                "aud": "re4qc69mpbck8uf69jd53oqpa",
                "event_id": "cd5c5fca-708b-45fc-a18f-488bc41c9385",
                "custom:userRole": "User",
                "token_use": "id",
                "auth_time": "1744630411",
                "name": "Alex",
                "phone_number": "+447305742926",
                "exp": "Mon Apr 14 12:33:31 UTC 2025",
                "iat": "Mon Apr 14 11:33:31 UTC 2025",
                "jti": "2b7ad3e0-2c7b-4996-981f-df55729126f5",
                "email": "ben813192@gmail.com"
            }
        },
        "resourcePath": "/bookings/{id}",
        "httpMethod": "GET",
        "extendedRequestId": "JAxC_E12gi0EZoA=",
        "requestTime": "14/Apr/2025:12:12:28 +0000",
        "path": "/prod/bookings/booking_1744201462869_417",
        "accountId": "229816860983",
        "protocol": "HTTP/1.1",
        "stage": "prod",
        "domainPrefix": "4m3m7j8611",
        "requestTimeEpoch": 1744632748362,
        "requestId": "3c4f6517-d5ca-4033-8109-338689921f17",
        "identity": {
            "cognitoIdentityPoolId": null,
            "accountId": null,
            "cognitoIdentityId": null,
            "caller": null,
            "sourceIp": "5.68.185.253",
            "principalOrgId": null,
            "accessKey": null,
            "cognitoAuthenticationType": null,
            "cognitoAuthenticationProvider": null,
            "userArn": null,
            "userAgent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
            "user": null
        },
        "domainName": "4m3m7j8611.execute-api.eu-north-1.amazonaws.com",
        "deploymentId": "khnkki",
        "apiId": "4m3m7j8611"
    },
    "body": null,
    "isBase64Encoded": false
}


[INFO] 2025-04-14T12:12:28.389Z 2b65300f-e2d7-4755-b0a9-4a111428276d Event received: {"resource": "/bookings/{id}", "path": "/bookings/booking_1744201462869_417", "httpMethod": "GET", "headers": {"accept": "*/*", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-GB,en-US;q=0.9,en;q=0.8", "Authorization": "Bearer eyJraWQiOiJNeVFzTG9KUTBvTG9vREJPVE8xamxYN1JoK1ZcL3VtRXdFTURqektPZnlGYz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIyMGRjYzljYy05MDUxLTcwNzUtNTZhYi1lYTQ5OWFkMDM3NmYiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1ub3J0aC0xLmFtYXpvbmF3cy5jb21cL2V1LW5vcnRoLTFfZ2VqV3lCNFpCIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjpmYWxzZSwiY3VzdG9tOmNvbXBhbnlJZCI6ImU3NGIyOTYxLWQ1ZTAtNDczOS04MDk1LTVmMWZiMGFjMWRjMiIsImNvZ25pdG86dXNlcm5hbWUiOiJhbGV4Iiwib3JpZ2luX2p0aSI6Ijc2MTMzMTIzLWQzZDctNDdhOS1hYTU5LTJmNWVmZDAzYjRkYiIsImF1ZCI6InJlNHFjNjltcGJjazh1ZjY5amQ1M29xcGEiLCJldmVudF9pZCI6ImNkNWM1ZmNhLTcwOGItNDVmYy1hMThmLTQ4OGJjNDFjOTM4NSIsImN1c3RvbTp1c2VyUm9sZSI6IlVzZXIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc0NDYzMDQxMSwibmFtZSI6IkFsZXgiLCJwaG9uZV9udW1iZXIiOiIrNDQ3MzA1NzQyOTI2IiwiZXhwIjoxNzQ0NjM0MDExLCJpYXQiOjE3NDQ2MzA0MTEsImp0aSI6IjJiN2FkM2UwLTJjN2ItNDk5Ni05ODFmLWRmNTU3MjkxMjZmNSIsImVtYWlsIjoiYmVuODEzMTkyQGdtYWlsLmNvbSJ9.cNq7978AaSfi4wx362awll9mqMZAAK5JOPbjnWnpzuU-ws0tqLzzzuvXXIj28ybJ2qNo4MKjUS_hON2BLxKX5jUmAPYAABJADq0ZRIgIrNarZM2B8gYGCsEwReDl6i-vKfqzo0WbTqbLgHef4ijD5_XzAekllYEKttG9Mr9Jbvh-n736rYdD1sACHloGJQABCJhftx5xH3M4DxdXZ-1DQxAmLHoM5pMtWO1mAJiPhI0AkCndEi2Vc0P2LINGNJUv9V9Dp8p1Sk4UHSFnH2MFSGEltFdvRCPX-DRSdMLPyjSC5_GBeNPmrZnYmjlABdqrkq9B5-YXlciFTjqgH7M56A", "content-type": "application/json", "Host": "4m3m7j8611.execute-api.eu-north-1.amazonaws.com", "origin": "http://localhost:3000", "priority": "u=1, i", "referer": "http://localhost:3000/", "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"", "sec-ch-ua-mobile": "?1", "sec-ch-ua-platform": "\"Android\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "cross-site", "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36", "X-Amzn-Trace-Id": "Root=1-67fcfbac-3ae479d84c8323c433a8bf89", "X-Forwarded-For": "5.68.185.253", "X-Forwarded-Port": "443", "X-Forwarded-Proto": "https"}, "multiValueHeaders": {"accept": ["*/*"], "accept-encoding": ["gzip, deflate, br, zstd"], "accept-language": ["en-GB,en-US;q=0.9,en;q=0.8"], "Authorization": ["Bearer eyJraWQiOiJNeVFzTG9KUTBvTG9vREJPVE8xamxYN1JoK1ZcL3VtRXdFTURqektPZnlGYz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIyMGRjYzljYy05MDUxLTcwNzUtNTZhYi1lYTQ5OWFkMDM3NmYiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1ub3J0aC0xLmFtYXpvbmF3cy5jb21cL2V1LW5vcnRoLTFfZ2VqV3lCNFpCIiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjpmYWxzZSwiY3VzdG9tOmNvbXBhbnlJZCI6ImU3NGIyOTYxLWQ1ZTAtNDczOS04MDk1LTVmMWZiMGFjMWRjMiIsImNvZ25pdG86dXNlcm5hbWUiOiJhbGV4Iiwib3JpZ2luX2p0aSI6Ijc2MTMzMTIzLWQzZDctNDdhOS1hYTU5LTJmNWVmZDAzYjRkYiIsImF1ZCI6InJlNHFjNjltcGJjazh1ZjY5amQ1M29xcGEiLCJldmVudF9pZCI6ImNkNWM1ZmNhLTcwOGItNDVmYy1hMThmLTQ4OGJjNDFjOTM4NSIsImN1c3RvbTp1c2VyUm9sZSI6IlVzZXIiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc0NDYzMDQxMSwibmFtZSI6IkFsZXgiLCJwaG9uZV9udW1iZXIiOiIrNDQ3MzA1NzQyOTI2IiwiZXhwIjoxNzQ0NjM0MDExLCJpYXQiOjE3NDQ2MzA0MTEsImp0aSI6IjJiN2FkM2UwLTJjN2ItNDk5Ni05ODFmLWRmNTU3MjkxMjZmNSIsImVtYWlsIjoiYmVuODEzMTkyQGdtYWlsLmNvbSJ9.cNq7978AaSfi4wx362awll9mqMZAAK5JOPbjnWnpzuU-ws0tqLzzzuvXXIj28ybJ2qNo4MKjUS_hON2BLxKX5jUmAPYAABJADq0ZRIgIrNarZM2B8gYGCsEwReDl6i-vKfqzo0WbTqbLgHef4ijD5_XzAekllYEKttG9Mr9Jbvh-n736rYdD1sACHloGJQABCJhftx5xH3M4DxdXZ-1DQxAmLHoM5pMtWO1mAJiPhI0AkCndEi2Vc0P2LINGNJUv9V9Dp8p1Sk4UHSFnH2MFSGEltFdvRCPX-DRSdMLPyjSC5_GBeNPmrZnYmjlABdqrkq9B5-YXlciFTjqgH7M56A"], "content-type": ["application/json"], "Host": ["4m3m7j8611.execute-api.eu-north-1.amazonaws.com"], "origin": ["http://localhost:3000"], "priority": ["u=1, i"], "referer": ["http://localhost:3000/"], "sec-ch-ua": ["\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\""], "sec-ch-ua-mobile": ["?1"], "sec-ch-ua-platform": ["\"Android\""], "sec-fetch-dest": ["empty"], "sec-fetch-mode": ["cors"], "sec-fetch-site": ["cross-site"], "User-Agent": ["Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"], "X-Amzn-Trace-Id": ["Root=1-67fcfbac-3ae479d84c8323c433a8bf89"], "X-Forwarded-For": ["5.68.185.253"], "X-Forwarded-Port": ["443"], "X-Forwarded-Proto": ["https"]}, "queryStringParameters": null, "multiValueQueryStringParameters": null, "pathParameters": {"id": "booking_1744201462869_417"}, "stageVariables": null, "requestContext": {"resourceId": "9r1f9h", "authorizer": {"claims": {"sub": "20dcc9cc-9051-7075-56ab-ea499ad0376f", "email_verified": "false", "iss": "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_gejWyB4ZB", "phone_number_verified": "false", "custom:companyId": "e74b2961-d5e0-4739-8095-5f1fb0ac1dc2", "cognito:username": "alex", "origin_jti": "76133123-d3d7-47a9-aa59-2f5efd03b4db", "aud": "re4qc69mpbck8uf69jd53oqpa", "event_id": "cd5c5fca-708b-45fc-a18f-488bc41c9385", "custom:userRole": "User", "token_use": "id", "auth_time": "1744630411", "name": "Alex", "phone_number": "+447305742926", "exp": "Mon Apr 14 12:33:31 UTC 2025", "iat": "Mon Apr 14 11:33:31 UTC 2025", "jti": "2b7ad3e0-2c7b-4996-981f-df55729126f5", "email": "ben813192@gmail.com"}}, "resourcePath": "/bookings/{id}", "httpMethod": "GET", "extendedRequestId": "JAxC_E12gi0EZoA=", "requestTime": "14/Apr/2025:12:12:28 +0000", "path": "/prod/bookings/booking_1744201462869_417", "accountId": "229816860983", "protocol": "HTTP/1.1", "stage": "prod", "domainPrefix": "4m3m7j8611", "requestTimeEpoch": 1744632748362, "requestId": "3c4f6517-d5ca-4033-8109-338689921f17", "identity": {"cognitoIdentityPoolId": null, "accountId": null, "cognitoIdentityId": null, "caller": null, "sourceIp": "5.68.185.253", "principalOrgId": null, "accessKey": null, "cognitoAuthenticationType": null, "cognitoAuthenticationProvider": null, "userArn": null, "userAgent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36", "user": null}, "domainName": "4m3m7j8611.execute-api.eu-north-1.amazonaws.com", "deploymentId": "khnkki", "apiId": "4m3m7j8611"}, "body": null, "isBase64Encoded": false}
2025-04-14T12:12:28.389Z
[INFO]	2025-04-14T12:12:28.389Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Auth header: Bearer eyJraWQiOiJNe...

[INFO] 2025-04-14T12:12:28.389Z 2b65300f-e2d7-4755-b0a9-4a111428276d Auth header: Bearer eyJraWQiOiJNe...
2025-04-14T12:12:28.389Z
[INFO]	2025-04-14T12:12:28.389Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Path parameters: 
{
    "id": "booking_1744201462869_417"
}


[INFO] 2025-04-14T12:12:28.389Z 2b65300f-e2d7-4755-b0a9-4a111428276d Path parameters: {"id": "booking_1744201462869_417"}
2025-04-14T12:12:28.389Z
[INFO]	2025-04-14T12:12:28.389Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Query parameters: 
{}


[INFO] 2025-04-14T12:12:28.389Z 2b65300f-e2d7-4755-b0a9-4a111428276d Query parameters: {}
2025-04-14T12:12:28.389Z
[INFO]	2025-04-14T12:12:28.389Z	2b65300f-e2d7-4755-b0a9-4a111428276d	📌 Found booking ID from path parameter 'id': booking_1744201462869_417

[INFO] 2025-04-14T12:12:28.389Z 2b65300f-e2d7-4755-b0a9-4a111428276d 📌 Found booking ID from path parameter 'id': booking_1744201462869_417
2025-04-14T12:12:28.389Z
[INFO]	2025-04-14T12:12:28.389Z	2b65300f-e2d7-4755-b0a9-4a111428276d	✅ Using booking ID: booking_1744201462869_417

[INFO] 2025-04-14T12:12:28.389Z 2b65300f-e2d7-4755-b0a9-4a111428276d ✅ Using booking ID: booking_1744201462869_417
2025-04-14T12:12:28.400Z
[INFO]	2025-04-14T12:12:28.400Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Successfully found booking with BookingId: booking_1744201462869_417

[INFO] 2025-04-14T12:12:28.400Z 2b65300f-e2d7-4755-b0a9-4a111428276d Successfully found booking with BookingId: booking_1744201462869_417
2025-04-14T12:12:28.400Z
[INFO]	2025-04-14T12:12:28.400Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Fetching images for booking: booking_1744201462869_417

[INFO] 2025-04-14T12:12:28.400Z 2b65300f-e2d7-4755-b0a9-4a111428276d Fetching images for booking: booking_1744201462869_417
2025-04-14T12:12:28.400Z
[INFO]	2025-04-14T12:12:28.400Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Fetching all files from Resources table...

[INFO] 2025-04-14T12:12:28.400Z 2b65300f-e2d7-4755-b0a9-4a111428276d Fetching all files from Resources table...
2025-04-14T12:12:28.440Z
[INFO]	2025-04-14T12:12:28.439Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Found 1 resources in Resources table

[INFO] 2025-04-14T12:12:28.439Z 2b65300f-e2d7-4755-b0a9-4a111428276d Found 1 resources in Resources table
2025-04-14T12:12:28.460Z
[INFO]	2025-04-14T12:12:28.460Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Generated presigned URL for booking_1744201462869_417/DJI_0242.JPG

[INFO] 2025-04-14T12:12:28.460Z 2b65300f-e2d7-4755-b0a9-4a111428276d Generated presigned URL for booking_1744201462869_417/DJI_0242.JPG
2025-04-14T12:12:28.460Z
[INFO]	2025-04-14T12:12:28.460Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Total resources found for booking booking_1744201462869_417: 1

[INFO] 2025-04-14T12:12:28.460Z 2b65300f-e2d7-4755-b0a9-4a111428276d Total resources found for booking booking_1744201462869_417: 1
2025-04-14T12:12:28.460Z
[INFO]	2025-04-14T12:12:28.460Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Fetching GeoTIFF data for booking: booking_1744201462869_417

[INFO] 2025-04-14T12:12:28.460Z 2b65300f-e2d7-4755-b0a9-4a111428276d Fetching GeoTIFF data for booking: booking_1744201462869_417
2025-04-14T12:12:28.461Z
[INFO]	2025-04-14T12:12:28.461Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Checking GeoTiffChunks table for completed reassemblies...

[INFO] 2025-04-14T12:12:28.461Z 2b65300f-e2d7-4755-b0a9-4a111428276d Checking GeoTiffChunks table for completed reassemblies...
2025-04-14T12:12:28.539Z
[INFO]	2025-04-14T12:12:28.539Z	2b65300f-e2d7-4755-b0a9-4a111428276d	[DEBUG] GeoTiffChunks scan result: found 1 items matching the criteria

[INFO] 2025-04-14T12:12:28.539Z 2b65300f-e2d7-4755-b0a9-4a111428276d [DEBUG] GeoTiffChunks scan result: found 1 items matching the criteria
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Found 1 completed reassemblies in GeoTiffChunks table

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d Found 1 completed reassemblies in GeoTiffChunks table
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	[DEBUG] Reassembly 1:

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d [DEBUG] Reassembly 1:
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	  - chunkId: 1744626247023_manifest

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d - chunkId: 1744626247023_manifest
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	  - sessionId: N/A

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d - sessionId: N/A
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	  - completedAt: 1744626259

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d - completedAt: 1744626259
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	  - finalResourceId: geotiff_1744626257_db85f41f

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d - finalResourceId: geotiff_1744626257_db85f41f
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	  - Has reassembledUrl: Yes

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d - Has reassembledUrl: Yes
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	  - reassembledUrl length: 1387, preview: https://pilotforce-resources.s3.amazonaws.com/book...

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d - reassembledUrl length: 1387, preview: https://pilotforce-resources.s3.amazonaws.com/book...
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	Using reassembled GeoTIFF with resource ID: geotiff_1744626257_db85f41f

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d Using reassembled GeoTIFF with resource ID: geotiff_1744626257_db85f41f
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	[DEBUG] Extracting S3 key from reassembledUrl: https://pilotforce-resources.s3.amazonaws.com/book...

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d [DEBUG] Extracting S3 key from reassembledUrl: https://pilotforce-resources.s3.amazonaws.com/book...
2025-04-14T12:12:28.540Z
[INFO]	2025-04-14T12:12:28.540Z	2b65300f-e2d7-4755-b0a9-4a111428276d	[DEBUG] Extracted S3 key from URL: booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif

[INFO] 2025-04-14T12:12:28.540Z 2b65300f-e2d7-4755-b0a9-4a111428276d [DEBUG] Extracted S3 key from URL: booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif
2025-04-14T12:12:28.560Z
[INFO]	2025-04-14T12:12:28.560Z	2b65300f-e2d7-4755-b0a9-4a111428276d	[DEBUG] Verified GeoTIFF exists in S3: booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif

[INFO] 2025-04-14T12:12:28.560Z 2b65300f-e2d7-4755-b0a9-4a111428276d [DEBUG] Verified GeoTIFF exists in S3: booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif
2025-04-14T12:12:28.560Z
[INFO]	2025-04-14T12:12:28.560Z	2b65300f-e2d7-4755-b0a9-4a111428276d	[DEBUG] Returning GeoTIFF data: 
{
    "filename": "Reassembled GeoTIFF",
    "url": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8",
    "presignedUrl": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8",
    "key": "booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif",
    "uploadDate": 1744626259,
    "resourceId": "geotiff_1744626257_db85f41f",
    "isReassembled": true,
    "sessionId": ""
}


[INFO] 2025-04-14T12:12:28.560Z 2b65300f-e2d7-4755-b0a9-4a111428276d [DEBUG] Returning GeoTIFF data: {"filename": "Reassembled GeoTIFF", "url": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8", "presignedUrl": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8", "key": "booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif", "uploadDate": 1744626259, "resourceId": "geotiff_1744626257_db85f41f", "isReassembled": true, "sessionId": ""}
2025-04-14T12:12:28.600Z
END RequestId: 2b65300f-e2d7-4755-b0a9-4a111428276d

END RequestId: 2b65300f-e2d7-4755-b0a9-4a111428276d
2025-04-14T12:12:28.600Z
REPORT RequestId: 2b65300f-e2d7-4755-b0a9-4a111428276d	Duration: 211.93 ms	Billed Duration: 212 ms	Memory Size: 128 MB	Max Memory Used: 89 MB	

REPORT RequestId: 2b65300f-e2d7-4755-b0a9-4a111428276d Duration: 211.93 ms Billed Duration: 212 ms Memory Size: 128 MB Max Memory Used: 89 MB


*CONSOLE LOGS*

====== FLIGHT DETAILS PAGE - FETCH BOOKING ======
FlightDetails.tsx:359 Attempting to fetch booking ID: booking_1744201462869_417
FlightDetails.tsx:358 ====== FLIGHT DETAILS PAGE - FETCH BOOKING ======
FlightDetails.tsx:359 Attempting to fetch booking ID: booking_1744201462869_417
FlightDetails.tsx:364 Using bookingUtils.getBookingById method...
bookingUtils.ts:134 Fetching booking with ID: booking_1744201462869_417
bookingUtils.ts:145 Calling API endpoint: https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/bookings/booking_1744201462869_417
FlightDetails.tsx:364 Using bookingUtils.getBookingById method...
bookingUtils.ts:134 Fetching booking with ID: booking_1744201462869_417
bookingUtils.ts:145 Calling API endpoint: https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/bookings/booking_1744201462869_417
FlightDetails.tsx:1061 Asset map loaded
FlightDetails.tsx:89 FlightDetails: Retrieved booking ID from params: booking_1744201462869_417
FlightDetails.tsx:89 FlightDetails: Retrieved booking ID from params: booking_1744201462869_417
bookingUtils.ts:164 Booking data received from API: {flightDate: '2025-04-10', location: '51.496946132512825, -2.5408095844298444', postcode: 'BS16 1QT', scheduling: {…}, userEmail: 'ben813192@gmail.com', …}
bookingUtils.ts:168 Validating 1 images received from API
bookingUtils.ts:265 Normalized URL for image DJI_0242.JPG: https://pilotforce-resources.s3.amazonaws.com/book...
FlightDetails.tsx:367 ✅ Successfully fetched booking via API: {flightDate: '2025-04-10', location: '51.496946132512825, -2.5408095844298444', postcode: 'BS16 1QT', scheduling: {…}, userEmail: 'ben813192@gmail.com', …}
FlightDetails.tsx:232 ✅ Found 1 resources in the booking response
FlightDetails.tsx:257 ✅ Processed 1 regular image resources
FlightDetails.tsx:460 Extracting locations from images: 1
FlightDetails.tsx:464 First image data structure: {
  "name": "DJI_0242.JPG",
  "url": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/DJI_0242.JPG?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3X6XBHO6H%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T121228Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiBSf3huxLYrewjcpHwD54u75Y3AEkWAy6bfSTy3yeWTbQIhAIwmPBDvo0RRAY9sUuCCw7LJLj2xWx%2Fc7Ig%2B%2FiBk%2FdLNKpQDCBUQABoMMjI5ODE2ODYwOTgzIgxM7NCrutKoADPTsuAq8QKQRBJ47lGag%2Fi5ldKO8%2BIVp3CfZWCFx2VIMShQ8mQl0WRY5iSKYuQX1OV5hZNhFI0WeoNqw8bA%2FsUJdx7hJXF7ApkuPFAOb%2FjbvfGssTEIzWPPgp0nz%2FVngXDik7pakyrz%2FdI2U7C8U6Hy8npJk821ME69uLn9x8UBqgtOkQ15oiMYD3f98AkEUysZU36JipaUPoY6eDQUXfckX2nquIx4ZhYr9SWL2bALo2Izl1a7xjmBs3vcL%2B%2BANTmJ3i7gAdGSul2XAPh2kmWPHI6%2FU2aNmKbHBKat2MgJhKkCBY835PULfHnRb3wrWmxNpf5vEVAW2%2FS%2FkoKr3i5Em1EVb%2BX5r3zPYdrl4uwq984Kds2lAufsvIWBv4khz97cGLn7F7At8wwv1KDbFA8lBEqEaYcGo1J%2F9iDFcSd40E2%2BGSDR6jXtHb5H%2FX%2F6FAS7P%2BX0FJAl3bHe8oNsjoXHp1xJzRg8nng6gFG%2BN2UrspwNMYXCIU4wq%2FfzvwY6nQHB7LPVrqYsbbpBa30YvzQbq%2BlG3%2Fc0NX0auCT7e6f3yo0ypg5%2FvlmuYdUiQY%2FAMj8ICLNDfh4D0xheDiLGaCCdYOrHsS5%2BcGX3bTWhxst3V22jVC3GFMHBBEYNQ3HsVLEKEEJ%2FyFm6gT3LjPaGnyseqvzA1Ip1gka5WARtjspzT80G5qlUW%2By2YipIAW9QeOsAjwOyf2oRzoDIY58H&X-Amz-Signature=c735baa53285e936f5925e4c8d3922f04a8d9f490b6f9717b38b6a66e0652858",
  "presignedUrl": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/DJI_0242.JPG?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3X6XBHO6H%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T121228Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiBSf3huxLYrewjcpHwD54u75Y3AEkWAy6bfSTy3yeWTbQIhAIwmPBDvo0RRAY9sUuCCw7LJLj2xWx%2Fc7Ig%2B%2FiBk%2FdLNKpQDCBUQABoMMjI5ODE2ODYwOTgzIgxM7NCrutKoADPTsuAq8QKQRBJ47lGag%2Fi5ldKO8%2BIVp3CfZWCFx2VIMShQ8mQl0WRY5iSKYuQX1OV5hZNhFI0WeoNqw8bA%2FsUJdx7hJXF7ApkuPFAOb%2FjbvfGssTEIzWPPgp0nz%2FVngXDik7pakyrz%2FdI2U7C8U6Hy8npJk821ME69uLn9x8UBqgtOkQ15oiMYD3f98AkEUysZU36JipaUPoY6eDQUXfckX2nquIx4ZhYr9SWL2bALo2Izl1a7xjmBs3vcL%2B%2BANTmJ3i7gAdGSul2XAPh2kmWPHI6%2FU2aNmKbHBKat2MgJhKkCBY835PULfHnRb3wrWmxNpf5vEVAW2%2FS%2FkoKr3i5Em1EVb%2BX5r3zPYdrl4uwq984Kds2lAufsvIWBv4khz97cGLn7F7At8wwv1KDbFA8lBEqEaYcGo1J%2F9iDFcSd40E2%2BGSDR6jXtHb5H%2FX%2F6FAS7P%2BX0FJAl3bHe8oNsjoXHp1xJzRg8nng6gFG%2BN2UrspwNMYXCIU4wq%2FfzvwY6nQHB7LPVrqYsbbpBa30YvzQbq%2BlG3%2Fc0NX0auCT7e6f3yo0ypg5%2FvlmuYdUiQY%2FAMj8ICLNDfh4D0xheDiLGaCCdYOrHsS5%2BcGX3bTWhxst3V22jVC3GFMHBBEYNQ3HsVLEKEEJ%2FyFm6gT3LjPaGnyseqvzA1Ip1gka5WARtjspzT80G5qlUW%2By2YipIAW9QeOsAjwOyf2oRzoDIY58H&X-Amz-Signature=c735baa53285e936f5925e4c8d3922f04a8d9f490b6f9717b38b6a66e0652858",
  "type": "image/jpeg",
  "resourceId": "file_1744630006653_e1135189",
  "uploadDate": "2025-04-14T11:26:46.653404",
  "FileName": "DJI_0242.JPG",
  "ResourceId": "file_1744630006653_e1135189",
  "ContentType": "image/jpeg",
  "S3Path": "booking_1744201462869_417/DJI_0242.JPG",
  "CreatedAt": "2025-04-14T11:26:46.653404"
}
FlightDetails.tsx:465 Has geolocation? false
FlightDetails.tsx:492 Image failed geolocation check: DJI_0242.JPG
FlightDetails.tsx:574 Extracted 0 image locations with metadata: []
FlightDetails.tsx:296 ✅ Found GeoTIFF data in booking response: {filename: 'Reassembled GeoTIFF', url: 'https://pilotforce-resources.s3.amazonaws.com/book…d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8', presignedUrl: 'https://pilotforce-resources.s3.amazonaws.com/book…d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8', key: 'booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif', uploadDate: 1744626259, …}
FlightDetails.tsx:304 ✅ Normalized GeoTIFF URL: https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_17446262...
FlightDetails.tsx:341 ✅ Using reassembled GeoTIFF file from GeoTiffChunks table
FlightDetails.tsx:345 ✅ GeoTIFF associated with resource ID: geotiff_1744626257_db85f41f
FlightDetails.tsx:431 ====== FLIGHT DETAILS PAGE - FETCH COMPLETE ======
FlightDetails.tsx:89 FlightDetails: Retrieved booking ID from params: booking_1744201462869_417
FlightDetails.tsx:333 ✅ Added GeoTIFF from GeoTiffChunks table to resources list
FlightDetails.tsx:89 FlightDetails: Retrieved booking ID from params: booking_1744201462869_417
FlightDetails.tsx:333 ✅ Added GeoTIFF from GeoTiffChunks table to resources list
ImageMap.tsx:90 📊 ImageMap: Received GeoTIFF resources: [{…}]
mapboxLogger.ts:14 [Mapbox] Received 1 GeoTIFF resources from FlightDetails component
ImageMap.tsx:93 📊 GeoTIFF 1 URL: https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8
ImageMap.tsx:94 📊 GeoTIFF 1 Name: Reassembled GeoTIFF
FlightDetails.tsx:440 🗺️ GeoTIFF resources available: 1
FlightDetails.tsx:442 🗺️ GeoTIFF 1: {name: 'Reassembled GeoTIFF', url: 'https://pilotforce-resources.s3.amazonaws.com/book…d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8', isReassembled: true, uploadDate: '1744626259'}
ImageMap.tsx:90 📊 ImageMap: Received GeoTIFF resources: [{…}]
mapboxLogger.ts:14 [Mapbox] Received 1 GeoTIFF resources from FlightDetails component
ImageMap.tsx:93 📊 GeoTIFF 1 URL: https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8
ImageMap.tsx:94 📊 GeoTIFF 1 Name: Reassembled GeoTIFF
bookingUtils.ts:164 Booking data received from API: {flightDate: '2025-04-10', location: '51.496946132512825, -2.5408095844298444', postcode: 'BS16 1QT', scheduling: {…}, userEmail: 'ben813192@gmail.com', …}
bookingUtils.ts:168 Validating 1 images received from API
bookingUtils.ts:265 Normalized URL for image DJI_0242.JPG: https://pilotforce-resources.s3.amazonaws.com/book...
FlightDetails.tsx:367 ✅ Successfully fetched booking via API: {flightDate: '2025-04-10', location: '51.496946132512825, -2.5408095844298444', postcode: 'BS16 1QT', scheduling: {…}, userEmail: 'ben813192@gmail.com', …}
FlightDetails.tsx:232 ✅ Found 1 resources in the booking response
FlightDetails.tsx:257 ✅ Processed 1 regular image resources
FlightDetails.tsx:460 Extracting locations from images: 1
FlightDetails.tsx:464 First image data structure: {
  "name": "DJI_0242.JPG",
  "url": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/DJI_0242.JPG?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3X6XBHO6H%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T121228Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiBSf3huxLYrewjcpHwD54u75Y3AEkWAy6bfSTy3yeWTbQIhAIwmPBDvo0RRAY9sUuCCw7LJLj2xWx%2Fc7Ig%2B%2FiBk%2FdLNKpQDCBUQABoMMjI5ODE2ODYwOTgzIgxM7NCrutKoADPTsuAq8QKQRBJ47lGag%2Fi5ldKO8%2BIVp3CfZWCFx2VIMShQ8mQl0WRY5iSKYuQX1OV5hZNhFI0WeoNqw8bA%2FsUJdx7hJXF7ApkuPFAOb%2FjbvfGssTEIzWPPgp0nz%2FVngXDik7pakyrz%2FdI2U7C8U6Hy8npJk821ME69uLn9x8UBqgtOkQ15oiMYD3f98AkEUysZU36JipaUPoY6eDQUXfckX2nquIx4ZhYr9SWL2bALo2Izl1a7xjmBs3vcL%2B%2BANTmJ3i7gAdGSul2XAPh2kmWPHI6%2FU2aNmKbHBKat2MgJhKkCBY835PULfHnRb3wrWmxNpf5vEVAW2%2FS%2FkoKr3i5Em1EVb%2BX5r3zPYdrl4uwq984Kds2lAufsvIWBv4khz97cGLn7F7At8wwv1KDbFA8lBEqEaYcGo1J%2F9iDFcSd40E2%2BGSDR6jXtHb5H%2FX%2F6FAS7P%2BX0FJAl3bHe8oNsjoXHp1xJzRg8nng6gFG%2BN2UrspwNMYXCIU4wq%2FfzvwY6nQHB7LPVrqYsbbpBa30YvzQbq%2BlG3%2Fc0NX0auCT7e6f3yo0ypg5%2FvlmuYdUiQY%2FAMj8ICLNDfh4D0xheDiLGaCCdYOrHsS5%2BcGX3bTWhxst3V22jVC3GFMHBBEYNQ3HsVLEKEEJ%2FyFm6gT3LjPaGnyseqvzA1Ip1gka5WARtjspzT80G5qlUW%2By2YipIAW9QeOsAjwOyf2oRzoDIY58H&X-Amz-Signature=c735baa53285e936f5925e4c8d3922f04a8d9f490b6f9717b38b6a66e0652858",
  "presignedUrl": "https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/DJI_0242.JPG?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3X6XBHO6H%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T121228Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiBSf3huxLYrewjcpHwD54u75Y3AEkWAy6bfSTy3yeWTbQIhAIwmPBDvo0RRAY9sUuCCw7LJLj2xWx%2Fc7Ig%2B%2FiBk%2FdLNKpQDCBUQABoMMjI5ODE2ODYwOTgzIgxM7NCrutKoADPTsuAq8QKQRBJ47lGag%2Fi5ldKO8%2BIVp3CfZWCFx2VIMShQ8mQl0WRY5iSKYuQX1OV5hZNhFI0WeoNqw8bA%2FsUJdx7hJXF7ApkuPFAOb%2FjbvfGssTEIzWPPgp0nz%2FVngXDik7pakyrz%2FdI2U7C8U6Hy8npJk821ME69uLn9x8UBqgtOkQ15oiMYD3f98AkEUysZU36JipaUPoY6eDQUXfckX2nquIx4ZhYr9SWL2bALo2Izl1a7xjmBs3vcL%2B%2BANTmJ3i7gAdGSul2XAPh2kmWPHI6%2FU2aNmKbHBKat2MgJhKkCBY835PULfHnRb3wrWmxNpf5vEVAW2%2FS%2FkoKr3i5Em1EVb%2BX5r3zPYdrl4uwq984Kds2lAufsvIWBv4khz97cGLn7F7At8wwv1KDbFA8lBEqEaYcGo1J%2F9iDFcSd40E2%2BGSDR6jXtHb5H%2FX%2F6FAS7P%2BX0FJAl3bHe8oNsjoXHp1xJzRg8nng6gFG%2BN2UrspwNMYXCIU4wq%2FfzvwY6nQHB7LPVrqYsbbpBa30YvzQbq%2BlG3%2Fc0NX0auCT7e6f3yo0ypg5%2FvlmuYdUiQY%2FAMj8ICLNDfh4D0xheDiLGaCCdYOrHsS5%2BcGX3bTWhxst3V22jVC3GFMHBBEYNQ3HsVLEKEEJ%2FyFm6gT3LjPaGnyseqvzA1Ip1gka5WARtjspzT80G5qlUW%2By2YipIAW9QeOsAjwOyf2oRzoDIY58H&X-Amz-Signature=c735baa53285e936f5925e4c8d3922f04a8d9f490b6f9717b38b6a66e0652858",
  "type": "image/jpeg",
  "resourceId": "file_1744630006653_e1135189",
  "uploadDate": "2025-04-14T11:26:46.653404",
  "FileName": "DJI_0242.JPG",
  "ResourceId": "file_1744630006653_e1135189",
  "ContentType": "image/jpeg",
  "S3Path": "booking_1744201462869_417/DJI_0242.JPG",
  "CreatedAt": "2025-04-14T11:26:46.653404"
}
FlightDetails.tsx:465 Has geolocation? false
FlightDetails.tsx:492 Image failed geolocation check: DJI_0242.JPG
FlightDetails.tsx:574 Extracted 0 image locations with metadata: []length: 0[[Prototype]]: Array(0)
FlightDetails.tsx:296 ✅ Found GeoTIFF data in booking response: {filename: 'Reassembled GeoTIFF', url: 'https://pilotforce-resources.s3.amazonaws.com/book…d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8', presignedUrl: 'https://pilotforce-resources.s3.amazonaws.com/book…d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8', key: 'booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif', uploadDate: 1744626259, …}
FlightDetails.tsx:304 ✅ Normalized GeoTIFF URL: https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_17446262...
FlightDetails.tsx:341 ✅ Using reassembled GeoTIFF file from GeoTiffChunks table
FlightDetails.tsx:345 ✅ GeoTIFF associated with resource ID: geotiff_1744626257_db85f41f
FlightDetails.tsx:431 ====== FLIGHT DETAILS PAGE - FETCH COMPLETE ======
FlightDetails.tsx:89 FlightDetails: Retrieved booking ID from params: booking_1744201462869_417
FlightDetails.tsx:89 FlightDetails: Retrieved booking ID from params: booking_1744201462869_417
mapboxLogger.ts:14 [Mapbox] Map loaded successfully
ImageMap.tsx:457 📊 ImageMap: GeoTIFF URL available on map load: https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8
mapboxLogger.ts:14 [Mapbox] GeoTIFF URL is available on map load
mapboxLogger.ts:14 [Mapbox] Image map loaded successfully
mapboxLogger.ts:14 [Mapbox] Adding GeoTIFF to image map: https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8
FlightDetails.tsx:89 FlightDetails: Retrieved booking ID from params: booking_1744201462869_417
FlightDetails.tsx:89 FlightDetails: Retrieved booking ID from params: booking_1744201462869_417
ImageMap.tsx:101 📊 ImageMap: GeoTIFF URL available on map load: https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8
mapboxLogger.ts:14 [Mapbox] GeoTIFF URL is available on map load
ImageMap.tsx:131 📊 addGeoTiff called with: https://pilotforce-resources.s3.amazonaws.com/book...
ImageMap.tsx:136 📊 Normalized GeoTiff URL: https://pilotforce-resources.s3.amazonaws.com/book...
geoTiffDiagnostic.ts:24 
            
            
           HEAD https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif
ImageMap.tsx:109 📊 ImageMap: Received GeoTIFF resources: [{…}]
mapboxLogger.ts:14 [Mapbox] Received 1 GeoTIFF resources from FlightDetails component
ImageMap.tsx:115 📊 GeoTIFF 1 URL: https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATLARHAE3ZGPMKJ5F%2F20250414%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250414T102419Z&X-Amz-Expires=1209600&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEIr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiEA1UPZqbv2Ar5pj2TWIKD2qK4LcU0gi3RsKR6ITOChwwgCIFHeOOS68yIFvosCD1Cn9L2TALsgvOLhc5i0pWaWhA5SKoMDCBQQABoMMjI5ODE2ODYwOTgzIgzzQEkNrNrFn9q8nwMq4AIetVSU%2BZ2YTh6%2Bm5PrnAIL6dX433PF0K28qxcBKfkz%2B7epwcpgZ2yCgjDO%2BULmyyJRbVXOz10Rfiu5Hy5Q1HRR%2BffvDrklYXMjyGCqzstBGpBRwrxevUdmpg%2BddlmOutXcH2zAOpSfaqdvd2YU71FKAh8eLesFm6y72%2FALWJXFjbeEK6KhWw%2FmS8RtXZY2JEMeKBjOb62qMPNmwXmdBu5Ks9CEgGB4yMeEg9V71%2FbrtfqgwoQ%2BCwG1P1ZsYAOW2k%2BwX9lwtQCOpA36MO8ka2iHR%2FQrW4MayXMkIjP5xyvM2zUatyyaN%2BgPPh%2F%2BEGbOB%2BMwvxFClnIUUc%2BRDekX8oJRV9h1Nj%2FUHNBCH5KdR7OUgtG44yTVhP3%2F3fNN77G%2B1PmCjccbFUbMqh9HXyHT75IIT6QlmJhdt6UmVkrlUuzkxKWCjmYwdyn4YTNsMMlWX%2B9GchIA%2FkI0xaPEdDlM09WjMMnE878GOp4BoZRlevLDRuKeW3a%2FjNUWTKD9TlWaFbtM5E2SqXnhYZV17qJXs2RfNoG5OdnB6l3iORn%2FVshbNWSt3QSTq6wkWlGui5VlV8O622S4KNTd96uUQA385aj4i94vuoB%2FgM96sLX76nsD%2B0IZAzurhvIF90hbF4APxMm%2Fokk%2FrP5e9ZEkCFs0LrqMSJwwFTcUxArU6MxZwUoBg5Q5ZGasjgk%3D&X-Amz-Signature=1b1fecb8bfde373d8f29c3060ba98698de998040fb20a70944a7b6559ef8e7a8
ImageMap.tsx:116 📊 GeoTIFF 1 Name: Reassembled GeoTIFF
ImageMap.tsx:123 📊 Loading first GeoTiff from resources
ImageMap.tsx:131 📊 addGeoTiff called with: https://pilotforce-resources.s3.amazonaws.com/book...
ImageMap.tsx:136 📊 Normalized GeoTiff URL: https://pilotforce-resources.s3.amazonaws.com/book...
geoTiffDiagnostic.ts:24 
            
            
           HEAD https://pilotforce-resources.s3.amazonaws.com/booking_1744201462869_417/reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif
ImageMap.tsx:180 📊 GeoTiff URL is valid
ImageMap.tsx:190 📊 Adding raster layer with URL: https://pilotforce-resources.s3.amazonaws.com/book...
ImageMap.tsx:221 📊 Attempting to load and parse GeoTIFF directly...
ImageMap.tsx:180 📊 GeoTiff URL is valid
ImageMap.tsx:190 📊 Adding raster layer with URL: https://pilotforce-resources.s3.amazonaws.com/book...
ImageMap.tsx:221 📊 Attempting to load and parse GeoTIFF directly...
ImageMap.tsx:230 📊 GeoTIFF dimensions: 5232 x 3666
ImageMap.tsx:231 📊 GeoTIFF bounding box: (4) [-2.613715994246931, 51.45525744064373, -2.612495712450824, 51.45611247754444]
ImageMap.tsx:230 📊 GeoTIFF dimensions: 5232 x 3666
ImageMap.tsx:231 📊 GeoTIFF bounding box: (4) [-2.613715994246931, 51.45525744064373, -2.612495712450824, 51.45611247754444]
ImageMap.tsx:307 📊 Successfully added GeoTIFF as image layer
ImageMap.tsx:313 📊 GeoTIFF is already loaded on the map
AuthContext.tsx:107 Performing scheduled token check