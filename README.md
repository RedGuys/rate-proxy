# rate-proxy

`rate-proxy` is a simple, configurable proxy server built with Node.js. It allows you to define routes and map them to different endpoints. It also supports rate limiting with a configurable timeout.

## Features

- Configurable routes: Define your own routes and map them to different endpoints.
- Rate limiting: Limit the rate of incoming requests with a configurable timeout.
- Verbose mode: Enable verbose mode for detailed logging.
- Configurable via command line options or a configuration file.

## Installation

This project requires Node.js and npm to run. Once you have those installed, you can install the project's dependencies by running:

```bash
npm install
```

## Usage

You can start the server with the following command:

```bash
npm start
```

The server supports several command line options:

- `-v, --verbose`: Enable verbose output.
- `-c, --config <file>`: Use a specific configuration file.
- `-t, --timeout <ms>`: Set the timeout in milliseconds (default is 500).
- `-H, --host <host>`: Set the host to connect to (default is localhost).
- `-p, --port <port>`: Set the port to listen on (default is 80).
- `-m, --map <map>`: Define a key:value endpoints mapping.

You can also define routes and their mappings in a configuration file. The configuration file is a JSON file with the following structure:

```json
{
  "routes": [
    {
      "srcPath": "/",
      "destPath": "/",
      "destHost": "localhost"
    }
  ]
}
```

Each route object in the `routes` array should have a `srcPath` (the path on the proxy server), a `destPath` (the path on the destination server), and a `destHost` (the host of the destination server).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT license.