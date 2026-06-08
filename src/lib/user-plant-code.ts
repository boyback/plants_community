type UserPlantCodeClient = {
  userPlant: {
    findUnique: (args: { where: { code: string }; select: { id: true } }) => Promise<{ id: string } | null>;
  };
};

export async function createUserPlantCode(
  client: UserPlantCodeClient,
  ownerId: string,
  nickname: string,
  acquiredAt: Date,
) {
  const ymd = acquiredAt.toISOString().slice(2, 10).replace(/-/g, '');
  const userPart = sanitizeCodePart(ownerId).slice(-6) || 'USER';
  const namePart = hashText(nickname).slice(0, 4);

  for (let i = 0; i < 20; i += 1) {
    const suffix = i === 0 ? '' : `-${i.toString(36).toUpperCase()}`;
    const code = `PL-${ymd}-${userPart}-${namePart}${suffix}`;
    const exists = await client.userPlant.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }

  return `PL-${ymd}-${userPart}-${namePart}-${Date.now().toString(36).toUpperCase()}`;
}

function sanitizeCodePart(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function hashText(value: string) {
  let hash = 5381;
  for (const char of value.trim()) {
    hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36).toUpperCase().padStart(4, '0');
}
