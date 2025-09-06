import {
  Directive,
  ElementRef,
  AfterViewInit,
  Output,
  EventEmitter,
  HostListener,
  Input,
} from '@angular/core';

@Directive({
  selector: '[appAutofocusAndHandleOutsideClick]',
})
export class AutofocusAndHandleOutsideClickDirective implements AfterViewInit {
  @Output() clickOutside = new EventEmitter();
  @Input() public clickOutsideIgnore: string[] = [];

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement: any) {
    const isClickedInside =
      this.elementRef.nativeElement.contains(targetElement);
    const isIgnoredElement = this.clickOutsideIgnore.some((selector) => {
      const ignoredElement = document.querySelector(selector);
      return ignoredElement && ignoredElement.contains(targetElement);
    });

    if (!isClickedInside && !isIgnoredElement) {
      return this.clickOutside.emit(null);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.elementRef.nativeElement.focus();
    }, 0);
  }
}
