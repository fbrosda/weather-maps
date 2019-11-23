import SimpleServer from "./SimpleServer";

const args = process.argv;
const port = args.length > 2 ? parseInt(args[2], 10) : 3000;

new SimpleServer(port);
