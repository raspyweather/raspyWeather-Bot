interface ImageCollectionItem {
    [key: string]: ImageCollectionSubItem[]
}

interface ImageCollectionSubItem {
    satelliteIdx: number,
    modeIdx: number,
    apiKeyIdx: number,
    id: string
}
