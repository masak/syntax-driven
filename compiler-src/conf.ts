export interface Conf {
    inlineKnownCalls: boolean;
}

export const OPT_NONE: Conf = {
    inlineKnownCalls: false,
}

export const OPT_ALL: Conf = {
    inlineKnownCalls: true,
}

