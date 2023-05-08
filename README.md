# serverless-package-external 📦

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
<!-- [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release) -->
<!-- [![npm version](https://badge.fury.io/js/serverless-package-external.svg)](https://badge.fury.io/js/serverless-package-external) -->

> Deploy a Serverless Python Function services with external code

Before deploying, this plugin links folders containing shared code into the dependencies directory of your Serverless function.

### Installation

```
npm i -D serverless-py-package-external
```

### Usage

```yml
service: service-name

plugins:
  - serverless-package-external

ecr:
  images:
    # Your images here

functions:
  # Your functions here

custom:
  packageExternal:
    common_utils:
      # Optional command to run after you have linked common_utils
      cmd: pip install -r requirements.txt -t .. > /dev/null 2>&1
      source: '../common_utils'
      # if no functions specified, it will apply it to all
      functions:
        - service-a
        - service-b
    api_utils:
      source: '../api_utils'
      functions:
        - service-b
```

#### Example Directory Structure

```
└── common_utils
    └── resource.py
└── api_utils
    └── resource.py
└── functions
  └── service-a
      └── handler.py
  └── service-b
      └── handler.py
  serverless.yml
```

In service-b/handler.py, external code can be imported:
```py
from common_utils.resource import shared_resource
from api_utils.resource import shared_resource
```
