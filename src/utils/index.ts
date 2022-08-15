export const deletePadZero = (hexNumber: string) => {
  return hexNumber.replace(/^(0x)0+((\w{4})+)$/, '$1$2');
};
