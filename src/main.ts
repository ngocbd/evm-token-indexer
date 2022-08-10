const main = async () => {
  console.log('Hello World!');
  return 1;
}

main().then(exitCode => {
  console.log("Application exit with code:", exitCode);
});
