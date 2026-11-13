import type { Action } from '../engine/state'
import type { Listener, Transport } from '../net/transport'
import { startTutorial, tutorialAct, tutorialNext, type TutState } from './runner'

export interface TutorialSession {
  transport: Transport
  getTut(): TutState
  next(): void
  subscribeTut(cb: () => void): () => void
}

/** A training game: a local engine whose every action goes through the tutorial script. */
export function createTutorialSession(seed?: number): TutorialSession {
  let { game, tut } = startTutorial(seed)
  const gameListeners = new Set<Listener>()
  const tutListeners = new Set<() => void>()
  const publish = () => {
    gameListeners.forEach((l) => l(game))
    tutListeners.forEach((l) => l())
  }
  return {
    transport: {
      mode: 'local',
      me: 'p1',
      getState: () => game,
      dispatch(action: Action) {
        const r = tutorialAct(game, tut, action)
        game = r.game
        tut = r.tut
        publish()
      },
      subscribe(cb) { gameListeners.add(cb); return () => gameListeners.delete(cb) },
      dispose() { gameListeners.clear(); tutListeners.clear() },
    },
    getTut: () => tut,
    next() {
      const r = tutorialNext(game, tut)
      game = r.game
      tut = r.tut
      publish()
    },
    subscribeTut(cb) { tutListeners.add(cb); return () => tutListeners.delete(cb) },
  }
}
