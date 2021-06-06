import {AfterViewInit, ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {FormControl} from '@angular/forms';
import {map, startWith} from 'rxjs/operators';
import {convertBashToWin} from '../../../src/convert-bash';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, AfterViewInit {

  code$: Observable<string>;
  bashScript = new FormControl(`#!/bin/bash

SOME_VAR="/c/cygwin/path"
rm -rf $SOME_VAR || echo "file not found"
cp /c/some/file /to/another/file

my_function () {
  echo "hello from my_function: $1"
}
# call the function:
my_function
# call the function with param:
my_function "some param"
`);

  ngOnInit(): void {

    this.code$ = this.bashScript.valueChanges.pipe(
      startWith(this.bashScript.value),
      map(bash => {
        try {
          if (!bash) {
            return 'REM enter bash script :)';
          }
          return convertBashToWin(bash);
        } catch (e) {
          return 'parse error: ' + e; // TODO leave old input and show error separately
        }

      })
    );
  }

  ngAfterViewInit(): void {
  }


}
