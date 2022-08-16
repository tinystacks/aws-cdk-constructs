import Prando from 'prando';

export interface CidrBlockAllocation {
  cidrBlock: string;
  seed: string;
  prefix: string;
  networkMask: number;
}

export interface AllocateCidrBlockArguments {
  seed: string;
  prefix?: string;
  networkMask?: number;
  exclusions?: string[];
}

interface ValidatedAllocateCidrBlockArguments {
  seed: string;
  prefix: string;
  networkMask: number;
  exclusions: string[];
}

function constructCidr (intHash: number, args: ValidatedAllocateCidrBlockArguments): CidrBlockAllocation {
  const {
    prefix: inputPrefix,
    networkMask,
    seed
  } = args;

  const addressCount = Math.pow(2, (32 - networkMask));
  let intHashPosition = 1;
  if (addressCount <= 256) {
    intHashPosition = 3;
  } else if (addressCount > 256 && addressCount < 65536) {
    intHashPosition = 2;
  }

  const prefixElems = inputPrefix.split('.');
  prefixElems[intHashPosition] = intHash.toString();
  const prefix = prefixElems.join('.');
  const cidrBlock = [prefix, networkMask].join('/');
  return {
    cidrBlock,
    networkMask,
    prefix,
    seed
  };
}

function isIPv4 (ip: string): boolean {
  const octets = ip.split('.');
  const hasFourOctets = octets.length === 4;
  const eachOctetIs8Bit = octets.reduce<boolean>((acc, octet: string) => {
    const numOctet = Number(octet);
    const octetIs8Bit = !Number.isNaN(numOctet) && numOctet >= 0 && numOctet <= 255;
    acc = acc && octetIs8Bit;
    return acc;
  }, true);
  return hasFourOctets && eachOctetIs8Bit;
}

function isValidNetworkMask (networkMask: number): boolean {
  return networkMask >= 8 && networkMask <= 32;
}

function validateArguments (args: AllocateCidrBlockArguments): ValidatedAllocateCidrBlockArguments {
  const {
    seed,
    prefix = '10.0.0.0',
    networkMask = 16,
    exclusions = []
  } = args;
  if (!seed || typeof seed !== 'string' || seed?.length < 1) {
    throw new Error(`Invalid value: ${seed}; "seed" argument must be a string with length greater than zero!`);
  }
  if (!isIPv4(prefix)) {
    throw new Error(`Invalid value: ${prefix}; "prefix" argument must be a valid IPv4 address!`);
  }
  if (!isValidNetworkMask(networkMask)) {
    throw new Error(`Invalid value: ${networkMask}; "networkMask" argument must be an integer between 8 and 32!`);
  }
  for (const exclusion of exclusions) {
    const [exclusionPrefix, exclusionNetworkMask] = exclusion.split('/');
    if (!isIPv4(exclusionPrefix) || !isValidNetworkMask(Number(exclusionNetworkMask))) {
      throw new Error(`Invalid exclusion value: ${exclusion}; an exclusion must be a valid IPv4 CIDR Block!`);
    }
  }

  return {
    seed,
    prefix,
    networkMask,
    exclusions
  };
}

function generateCidrBlock (rng: Prando, args: ValidatedAllocateCidrBlockArguments): CidrBlockAllocation {
  const {
    exclusions
  } = args;
  const intHash = rng.nextInt(0, 255);
  const cidrBlockAllocation = constructCidr(intHash, args);
  if (exclusions?.includes(cidrBlockAllocation.cidrBlock)) return generateCidrBlock(rng, args);
  return cidrBlockAllocation;
}

export function allocateCidrBlock (args: AllocateCidrBlockArguments): CidrBlockAllocation {
  const validatedArguments = validateArguments(args);
  const rng = new Prando(validatedArguments.seed);
  return generateCidrBlock(rng, validatedArguments);
}