/// <reference path="../../node_modules/rx/ts/rx.all.d.ts" />


import * as rx from "rx";

import {Node} from "../Graph";
import {Container, Navigator} from "../Viewer";
import * as rest from "rest";

import {IUI, IRect, IORResponse} from "../UI";

export class DetectionsUI implements IUI {
    private disposable: rx.IDisposable;
    private navigator: Navigator;
    private container: Container;
    private rectContainer: HTMLElement;
    private detectionData: IORResponse;

    constructor(container: Container, navigator: Navigator) {
        this.container = container;
        this.navigator = navigator;
    }

    public activate(): void {

        let child: HTMLElement = document.createElement("div");
        child.className = "rectContainer";

        this.rectContainer = child;
        this.container.element.appendChild(this.rectContainer);

        let cid: string = "MkJKbDA0bnZuZlcxeTJHTmFqN3g1dzo5NWEzOTg3OWUxZDI3MjM4";

        this.disposable = this.navigator
            .stateService2
            .currentNode.subscribe((node: Node): void => {
                this.setRectContainer(node.image.width, node.image.height);

                this.removeRectsFromDOM();
                let url: string = `https://a.mapillary.com/v2/im/${node.key}/or?client_id=${cid}`;
                rest(url).then((data: any) => {
                    this.detectionData = JSON.parse(data.entity);

                    this.updateRects(this.detectionData.or_rects);
                });
            });
    }

    public deactivate(): void {
        this.disposable.dispose();
    }

   /**
    * Update detection rects in the DOM
    */
    private updateRects (rects: Array<IRect>): void {
        rects.forEach((r: IRect) => {
            let rect: HTMLElement = document.createElement("div");

            let adjustedRect: Array<number> = this.coordsToCss(r.rect);

            // map adjusted coordinates to valid CSS styles
            let rectMapped: Array<string> = adjustedRect.map((el: number) => {
                return (el * 100) + "%";
            });

            this.setRectStyling(rect, rectMapped);
            this.rectContainer.appendChild(rect);
        });
    }

    /**
     * Adjust x1, y1, x2, y2 coordinates to CSS styling, so the rectangle
     * can displays correctly with top, ripht, bottom, left styling.
     */
    private coordsToCss (rects: Array<number>): Array<number> {

        // copy the array
        let adjustedCoords: Array<number> = rects.concat();

        // adjust the x2 (right) position
        adjustedCoords[2] = 1 - adjustedCoords[2];

        // adjust the y2 (bottom) position
        adjustedCoords[3] = 1 - adjustedCoords[3];

        return adjustedCoords;

    }

    /**
     * Set the className and position of the rectangle. Expects the `position: absolute`
     * being set through CSS stylesheets.
     */
    private setRectStyling (rect: HTMLElement, mappedRect: Array<string>): void {
        rect.className = "Rect";
        rect.style.top = mappedRect[1];
        rect.style.bottom = mappedRect[3];
        rect.style.right = mappedRect[2];
        rect.style.left = mappedRect[0];
    }

    /**
     * Remove all existing DOM nodes from the container
     */
    private removeRectsFromDOM (): void {
        while (this.rectContainer.firstChild) {
            this.rectContainer.removeChild(this.rectContainer.firstChild);
        }
    }


    /**
     * Sets the rectContainer size to match ratio of currently displayed photo
     */
    private setRectContainer (w: number, h: number): void {
        let cw: number = this.container.element.clientWidth;
        let ch: number = this.container.element.clientHeight;

        let ratioW: number = (ch / h * w);

        let offset: number  = (cw - ratioW) / 2;

        this.rectContainer.style.left = `${offset}px`;
        this.rectContainer.style.right = `${offset}px`;
    }

}

export default DetectionsUI;