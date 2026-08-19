const port = process.env.PORT ?? 3000;
const environment = process.env.NODE_ENV ?? "development";

console.log(`URL shortener initialized.`);
console.log(`Environment: ${environment}`);
console.log(`Port: ${port}`);

