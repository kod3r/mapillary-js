// <reference path="../../node_modules/rx/ts/rx.all.d.ts" />

import * as rx from "rx";

import {ComponentService, Component} from "../Component";
import {Container, Navigator} from "../Viewer";

export class MouseComponent extends Component {
    public static componentName: string = "mouse";

    private _mouseDragSubscription: rx.IDisposable;

    constructor(name: string, container: Container, navigator: Navigator) {
        super(name, container, navigator);
    }

    protected _activate(): void {
        this._container.mouseService.claimMouse(this._name, 0);
        this._mouseDragSubscription = this._container.mouseService
            .filteredMouseEvent$(this._name, this._container.mouseService.mouseDrag$)
            .merge(this._container.mouseService.mouseDragEnd$)
            .pairwise()
            .subscribe((pair: any): void => {
                let prev: MouseEvent = pair[0].e;
                let e: MouseEvent = pair[1].e;

                let movementX: number = (prev && e) ? e.screenX - prev.screenX : 1;
                let movementY: number = (prev && e) ? e.screenY - prev.screenY : 1;

                let width: number = this._container.element.offsetWidth;
                let height: number = this._container.element.offsetHeight;

                let size: number = Math.max(width, height);

                let w: number = width / size;
                let h: number = height / size;

                let max: number = Math.PI / 2;

                let phi: number = w * max * movementX / size;
                let theta: number = -h * max * movementY / size;

                this._navigator.stateService.rotate({ phi: phi, theta: theta });
            });
    }

    protected _deactivate(): void {
        this._container.mouseService.unclaimMouse(this._name);
        this._mouseDragSubscription.dispose();
    }
}

ComponentService.register(MouseComponent);
export default MouseComponent;
