/*
*  Copyright 2016 Alexander Tsybulsky and other contributors
*  Copyright 2020 Centrapay and other contributors
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*  http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

const Tags = require('./tags');
const helperModels = require('./helperModels');
const StatementVisitor = require('./statementVisitor');

/**
* Validate group of tags (required tags present, currency is consistent, consistent balances vs turnover)
*/
function validateGroup({ group, groupNumber }) {
  // Check mandatory tags
  const mandatoryTags = [
    Tags.TagTransactionReferenceNumber, //20
    Tags.TagAccountIdentification,      //25
    Tags.TagStatementNumber,            //28
    Tags.TagOpeningBalance,             //60
    Tags.TagClosingBalance              //62
  ];
  for (let Tag of mandatoryTags) {
    if (!group.find(t => t instanceof Tag)) {
      throw Error(`Mandatory tag ${Tag.ID} is missing in group ${groupNumber}`);
    }
  }

  // Check same currency
  let currency = '';
  for (let i of group.filter(i => i instanceof Tags.TagBalance)) {
    if (!currency) {
      currency = i.fields.currency;
    } else if (currency !== i.fields.currency) {
      throw Error(`Currency markers are differ [${currency}, ${i.fields.currency}] in group ${groupNumber}`);
    }
  }

  // Check turnover
  const ob = group.find(i => i instanceof Tags.TagOpeningBalance);
  const cb = group.find(i => i instanceof Tags.TagClosingBalance);
  const turnover = cb.fields.amount - ob.fields.amount;

  const sumLines = group
    .filter(i => i instanceof Tags.TagStatementLine)
    .reduce((prev, cur) => prev + cur.fields.amount, 0.0);

  if (!helperModels.Amount.isEqual(sumLines, turnover)) {
    throw Error(`Sum of lines (${sumLines}) != turnover (${turnover}) in group ${groupNumber}`);
  }
}

/**
 * Build statement object
 */
function buildStatement({ group, withTags, with86Structure }) {
  const visitor = new StatementVisitor({
    withTags,
    with86Structure,
  });
  group.forEach(tag => tag.accept(visitor));
  return visitor.toMt940Statement();
}

module.exports = {
  validateGroup,
  buildStatement,
};