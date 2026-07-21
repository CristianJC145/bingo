export interface Figure {
    id: number;
    name: string;
    pattern: boolean[][];
}

interface Range {
    start?: number;
    end?: number;
    specific?: number[]
}

export interface CheckWinnerRequest {
    balls: number[];
    figures: Figure[];
    range: Range;
}