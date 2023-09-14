export interface Conf {
    inlineKnownCalls: boolean;
    eliminateTailSelfCalls: boolean;
    eliminateSelfCalls: boolean;
}

export const OPT_NONE: Conf = {
    inlineKnownCalls: false,
    eliminateTailSelfCalls: false,
    eliminateSelfCalls: false,
}

export const OPT_ALL: Conf = {
    inlineKnownCalls: true,
    eliminateTailSelfCalls: true,
    eliminateSelfCalls: true,
}

