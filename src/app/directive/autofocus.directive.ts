import {
  Directive,
  ElementRef,
  AfterViewInit,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';

@Directive({
  selector: '[appAutofocus]',
})
export class AutofocusDirective implements AfterViewInit {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onGlobalClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.clickOutside.emit();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.el.nativeElement.focus();
    }, 0);
  }
}
