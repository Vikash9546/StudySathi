let index = 0;

export function balanceLoad() {
  const providers = ['groq'];
  const provider = providers[index % providers.length];
  index++;
  return { provider };
}
