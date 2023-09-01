export interface Conf {
    inlineKnownCalls: boolean;
    eliminateTailSelfCalls: boolean;
}

export const OPT_NONE: Conf = {
    inlineKnownCalls: false,
    eliminateTailSelfCalls: false,
}

export const OPT_ALL: Conf = {
    inlineKnownCalls: true,
    eliminateTailSelfCalls: true,
}

